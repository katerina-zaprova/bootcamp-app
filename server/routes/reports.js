const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Schema migration (idempotent) ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id       INTEGER NOT NULL REFERENCES test_runs_v2(id),
    suite_name   TEXT    NOT NULL,
    run_date     TEXT    NOT NULL,
    total_count  INTEGER NOT NULL DEFAULT 0,
    passed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    results      TEXT    NOT NULL DEFAULT '[]',
    generated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

// ── Seed one demo report if the table is empty ────────────────────────────────
try {
  const n = db.prepare('SELECT COUNT(*) as n FROM reports').get().n;
  if (n === 0) {
    const run = db.prepare(`
      SELECT r.id, r.pass_count, r.fail_count, r.skip_count, r.created_at,
             s.name as suite_name
      FROM test_runs_v2 r
      JOIN test_suites s ON s.id = r.suite_id
      ORDER BY r.id ASC LIMIT 1
    `).get();
    if (run) {
      const cases = db.prepare(`
        SELECT rr.id, rr.result, rr.duration_ms, rr.notes, rr.github_issue_url,
               tc.title
        FROM test_run_results rr
        JOIN test_cases tc ON tc.id = rr.test_case_id
        WHERE rr.run_id = ?
        ORDER BY rr.id ASC
      `).all(run.id);

      const snapshot = cases.map((c, i) => ({
        index: i + 1,
        title: c.title,
        result: c.result || 'pending',
        duration_ms: c.duration_ms,
        notes: c.notes || null,
        github_issue_url: c.github_issue_url || null,
      }));

      db.prepare(`
        INSERT INTO reports
          (run_id, suite_name, run_date, total_count, passed_count, failed_count,
           skipped_count, results, generated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        run.id, run.suite_name, run.created_at,
        cases.length,
        cases.filter(c => c.result === 'passed').length,
        cases.filter(c => c.result === 'failed').length,
        cases.filter(c => c.result === 'skipped').length,
        JSON.stringify(snapshot),
      );
    }
  }
} catch (_) { /* non-fatal: seed is best-effort */ }

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildSnapshot(runId) {
  const run = db.prepare(`
    SELECT r.id, r.pass_count, r.fail_count, r.skip_count, r.created_at,
           s.name as suite_name
    FROM test_runs_v2 r
    JOIN test_suites s ON s.id = r.suite_id
    WHERE r.id = ?
  `).get(runId);
  if (!run) return null;

  const cases = db.prepare(`
    SELECT rr.id, rr.result, rr.duration_ms, rr.notes, rr.github_issue_url,
           tc.title
    FROM test_run_results rr
    JOIN test_cases tc ON tc.id = rr.test_case_id
    WHERE rr.run_id = ?
    ORDER BY rr.id ASC
  `).all(runId);

  return {
    run,
    total: cases.length,
    passed: cases.filter(c => c.result === 'passed').length,
    failed: cases.filter(c => c.result === 'failed').length,
    skipped: cases.filter(c => c.result === 'skipped').length,
    snapshot: cases.map((c, i) => ({
      index: i + 1,
      title: c.title,
      result: c.result || 'pending',
      duration_ms: c.duration_ms,
      notes: c.notes || null,
      github_issue_url: c.github_issue_url || null,
    })),
  };
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDuration(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function generateHtml(report) {
  const results = typeof report.results === 'string'
    ? JSON.parse(report.results)
    : report.results;

  const passRate = report.total_count > 0
    ? Math.round((report.passed_count / report.total_count) * 100)
    : 0;

  const rows = results.map(r => {
    const cls = r.result === 'failed' ? ' class="row-failed"' : '';
    const badge = {
      passed:  '<span class="badge badge-passed">&#10003; Passed</span>',
      failed:  '<span class="badge badge-failed">&#10007; Failed</span>',
      skipped: '<span class="badge badge-skipped">&#8722; Skipped</span>',
      pending: '<span class="badge badge-pending">&#9675; Pending</span>',
    }[r.result] ?? '<span class="badge badge-pending">&#9675; Pending</span>';

    const ghLink = r.github_issue_url
      ? `<br><a href="${escHtml(r.github_issue_url)}" class="gh-link">GitHub issue ↗</a>`
      : '';

    return `
      <tr${cls}>
        <td class="col-num">${r.index}</td>
        <td>${escHtml(r.title)}</td>
        <td class="col-result">${badge}</td>
        <td class="col-dur">${fmtDuration(r.duration_ms)}</td>
        <td class="col-notes">${r.notes ? escHtml(r.notes) : '—'}${ghLink}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Test Report — ${escHtml(report.suite_name)}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,sans-serif;
      font-size:14px;color:#111827;background:#fff;
      padding:2.5rem 3rem;max-width:980px;margin:0 auto;
    }

    /* ── Header ─────────────────────────────────────────────────────────── */
    .hd-title{font-size:22px;font-weight:700;margin-bottom:.25rem}
    .hd-meta{font-size:13px;color:#6b7280;margin-bottom:1.5rem}

    /* ── Summary cards ───────────────────────────────────────────────────── */
    .summary{display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem}
    .card{flex:1 1 90px;border-radius:8px;padding:.75rem 1rem;text-align:center;border:1px solid #e5e7eb}
    .card .n{font-size:26px;font-weight:700;line-height:1.1}
    .card .lbl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-top:3px}
    .card-pass{background:#f0fdf4;border-color:#86efac}.card-pass .n{color:#16a34a}
    .card-fail{background:#fef2f2;border-color:#fca5a5}.card-fail .n{color:#dc2626}
    .card-skip{background:#f9fafb;border-color:#d1d5db}.card-skip .n{color:#6b7280}
    .card-tot {background:#eff6ff;border-color:#bfdbfe}.card-tot  .n{color:#1d4ed8}
    .pass-rate{font-size:15px;font-weight:600;color:#374151;margin-bottom:2rem}
    .pass-rate em{font-style:normal;color:#16a34a}

    /* ── Table ───────────────────────────────────────────────────────────── */
    table{width:100%;border-collapse:collapse;font-size:13px}
    thead{background:#f9fafb}
    th{
      padding:9px 12px;text-align:left;font-size:11px;font-weight:600;
      color:#6b7280;text-transform:uppercase;letter-spacing:.05em;
      border-bottom:2px solid #e5e7eb
    }
    td{padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top}
    tr:last-child td{border-bottom:none}
    .col-num{width:36px;color:#9ca3af}
    .col-result{width:110px}
    .col-dur{width:90px;color:#6b7280;white-space:nowrap}
    .col-notes{color:#6b7280;font-size:12px}
    .row-failed{background:#fff7f7}

    /* ── Badges ──────────────────────────────────────────────────────────── */
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600}
    .badge-passed {background:#dcfce7;color:#16a34a}
    .badge-failed {background:#fee2e2;color:#dc2626}
    .badge-skipped{background:#f3f4f6;color:#6b7280}
    .badge-pending{background:#f3f4f6;color:#9ca3af}
    .gh-link{font-size:11px;color:#6366f1;text-decoration:none}
    .gh-link:hover{text-decoration:underline}

    /* ── Footer ──────────────────────────────────────────────────────────── */
    .footer{
      margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;
      font-size:12px;color:#9ca3af
    }

    /* ── Print ───────────────────────────────────────────────────────────── */
    @media print{
      body{padding:1cm 1.5cm;font-size:11px}
      .hd-meta{margin-bottom:1rem}
      .summary{gap:.5rem}
      .card{padding:.5rem .75rem}
      .card .n{font-size:20px}
      table{font-size:10px}
      th,td{padding:6px 8px}
      tr{page-break-inside:avoid}
      thead{display:table-header-group}
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
      .card-pass,.card-fail,.card-skip,.card-tot,.row-failed{
        -webkit-print-color-adjust:exact
      }
    }
  </style>
</head>
<body>
  <h1 class="hd-title">${escHtml(report.suite_name)}</h1>
  <p class="hd-meta">
    Run date: ${fmtDate(report.run_date)}&nbsp;&nbsp;·&nbsp;&nbsp;Generated: ${fmtDate(report.generated_at)}
  </p>

  <div class="summary">
    <div class="card card-pass"><div class="n">${report.passed_count}</div><div class="lbl">Passed</div></div>
    <div class="card card-fail"><div class="n">${report.failed_count}</div><div class="lbl">Failed</div></div>
    <div class="card card-skip"><div class="n">${report.skipped_count}</div><div class="lbl">Skipped</div></div>
    <div class="card card-tot" ><div class="n">${report.total_count}</div> <div class="lbl">Total</div></div>
  </div>
  <p class="pass-rate">Pass rate: <em>${passRate}%</em></p>

  <table>
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th>Test Case</th>
        <th class="col-result">Result</th>
        <th class="col-dur">Duration</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:2rem 0">No results recorded</td></tr>'}
    </tbody>
  </table>

  <p class="footer">Report #${report.id} &nbsp;·&nbsp; bootcamp-app &nbsp;·&nbsp; ${fmtDate(report.generated_at)}</p>
</body>
</html>`;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/reports  — generate a snapshot from a run
router.post('/', (req, res) => {
  const runId = Number(req.body?.run_id);
  if (!runId) {
    return res.status(400).json({ success: false, data: null, error: 'run_id is required' });
  }
  try {
    const snap = buildSnapshot(runId);
    if (!snap) {
      return res.status(404).json({ success: false, data: null, error: 'Run not found' });
    }
    const { run, total, passed, failed, skipped, snapshot } = snap;
    const result = db.prepare(`
      INSERT INTO reports
        (run_id, suite_name, run_date, total_count, passed_count, failed_count,
         skipped_count, results, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(run.id, run.suite_name, run.created_at, total, passed, failed, skipped,
           JSON.stringify(snapshot));

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid);
    report.results = JSON.parse(report.results);
    res.status(201).json({ success: true, data: report, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// GET /api/reports  — list all reports
router.get('/', (req, res) => {
  try {
    const reports = db.prepare(`
      SELECT id, run_id, suite_name, run_date, total_count, passed_count,
             failed_count, skipped_count, generated_at
      FROM reports
      ORDER BY generated_at DESC
    `).all();
    res.json({ success: true, data: reports, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// GET /api/reports/:id  — single report
router.get('/:id', (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, data: null, error: 'Report not found' });
    }
    report.results = JSON.parse(report.results);
    res.json({ success: true, data: report, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// GET /api/reports/:id/export/html  — download self-contained HTML
router.get('/:id/export/html', (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!report) {
      return res.status(404).send('Report not found');
    }
    const html = generateHtml(report);
    const filename = `report-${report.id}-${report.suite_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (err) {
    res.status(500).send('Failed to generate report: ' + err.message);
  }
});

module.exports = router;
