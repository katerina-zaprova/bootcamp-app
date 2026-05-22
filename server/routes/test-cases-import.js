const express = require('express');
const router  = express.Router();
const db      = require('../db');

const VALID_SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const REQUIRED_HEADERS  = ['title', 'severity', 'steps'];

// ── CSV parser (no external deps) ─────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"')      { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else                 { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  // Strip UTF-8 BOM
  const src = text.replace(/^﻿/, '');
  const lines = src.split(/\r?\n/);

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((h, j) => { record[h] = values[j] ?? ''; });
    records.push(record);
  }
  return { headers, records };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliseSeverity(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const match = VALID_SEVERITIES.find(v => v.toLowerCase() === s.toLowerCase());
  return match ?? null;
}

function validateRow(row) {
  const errors = [];
  if (!row.title?.trim())  errors.push('title is required');
  if (!row.steps?.trim())  errors.push('steps is required');
  const sev = normaliseSeverity(row.severity);
  if (!sev) errors.push(`severity must be Critical / Major / Minor / Trivial (got: "${row.severity ?? ''}")`);
  return { errors, severity: sev };
}

// ── POST /api/test-cases/import/preview ───────────────────────────────────────
// Body: { suite_id: number, csv: string }
router.post('/preview', express.json({ limit: '5mb' }), (req, res) => {
  try {
    const suiteId = Number(req.body?.suite_id);
    if (!suiteId) {
      return res.status(400).json({ success: false, data: null, error: 'suite_id is required' });
    }
    if (!req.body?.csv || typeof req.body.csv !== 'string') {
      return res.status(400).json({ success: false, data: null, error: 'csv string is required' });
    }

    const suite = db.prepare('SELECT id, name FROM test_suites WHERE id = ?').get(suiteId);
    if (!suite) {
      return res.status(404).json({ success: false, data: null, error: 'Suite not found' });
    }

    let headers, records;
    try {
      ({ headers, records } = parseCSV(req.body.csv));
    } catch (parseErr) {
      return res.status(422).json({ success: false, data: null, error: `CSV parse error: ${parseErr.message}` });
    }

    if (records.length === 0) {
      return res.status(422).json({ success: false, data: null, error: 'CSV file contains no data rows' });
    }

    const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      return res.status(422).json({
        success: false, data: null,
        error: `Missing required column(s): ${missing.join(', ')}. File has: ${headers.join(', ')}`,
      });
    }

    // rowNum is 1-based; +1 for header row → index 0 = row 2
    const rows = records.map((record, i) => {
      const { errors, severity } = validateRow(record);
      const valid = errors.length === 0;
      return {
        rowNum: i + 2,
        data: {
          title:           record.title ?? '',
          severity:        valid ? severity : (record.severity ?? ''),
          steps:           record.steps ?? '',
          description:     record.description ?? '',
          expected_result: record.expected_result ?? '',
        },
        valid,
        errors,
      };
    });

    const valid   = rows.filter(r => r.valid).length;
    const invalid = rows.filter(r => !r.valid).length;

    res.json({ success: true, data: { total: rows.length, valid, invalid, suite, rows }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// ── POST /api/test-cases/import/commit ────────────────────────────────────────
// Body: { suite_id: number, rows: [...] }
router.post('/commit', express.json({ limit: '5mb' }), (req, res) => {
  try {
    const { suite_id, rows } = req.body ?? {};
    const suiteId = Number(suite_id);

    if (!suiteId) {
      return res.status(400).json({ success: false, data: null, error: 'suite_id is required' });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, data: null, error: 'rows array is required' });
    }

    const suite = db.prepare('SELECT id FROM test_suites WHERE id = ?').get(suiteId);
    if (!suite) {
      return res.status(404).json({ success: false, data: null, error: 'Suite not found' });
    }

    const insertCase = db.prepare(`
      INSERT INTO test_cases (title, severity, steps, expected_result, preconditions, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `);
    const insertLink = db.prepare(`
      INSERT INTO suite_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)
    `);
    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) as m FROM suite_cases WHERE suite_id = ?'
    );

    let imported = 0;
    let skipped  = 0;

    const insertMany = db.transaction(rowList => {
      let order = maxOrder.get(suiteId).m + 1;
      for (const row of rowList) {
        const { errors, severity } = validateRow(row);
        if (errors.length > 0) { skipped++; continue; }
        const result = insertCase.run(
          row.title.trim(),
          severity,
          JSON.stringify([row.steps.trim()]),
          (row.expected_result ?? '').trim() || '',
          (row.description ?? '').trim() || null,
        );
        insertLink.run(suiteId, result.lastInsertRowid, order++);
        imported++;
      }
    });

    insertMany(rows);

    res.json({ success: true, data: { imported, skipped }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

module.exports = router;
