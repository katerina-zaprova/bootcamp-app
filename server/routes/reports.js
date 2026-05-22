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

  const overallPassed = report.failed_count === 0 && report.total_count > 0;
  const statusLabel   = report.total_count === 0 ? 'NO RESULTS'
    : overallPassed ? 'PASSED' : 'FAILED';
  const statusCls     = report.total_count === 0 ? 'status-pending'
    : overallPassed ? 'status-passed' : 'status-failed';

  const passRateColor = passRate === 100 ? '#16a34a'
    : passRate >= 70 ? '#d97706'
    : '#dc2626';

  const rows = results.map(r => {
    const rowCls = r.result === 'failed' ? ' class="row-failed"'
      : r.result === 'skipped' ? ' class="row-skipped"' : '';

    const badge = {
      passed:  '<span class="badge badge-passed">&#10003;&nbsp;Passed</span>',
      failed:  '<span class="badge badge-failed">&#10007;&nbsp;Failed</span>',
      skipped: '<span class="badge badge-skipped">&#8722;&nbsp;Skipped</span>',
      pending: '<span class="badge badge-pending">&#9675;&nbsp;Pending</span>',
    }[r.result] ?? '<span class="badge badge-pending">&#9675;&nbsp;Pending</span>';

    const ghLink = r.github_issue_url
      ? `<div style="margin-top:3px"><a href="${escHtml(r.github_issue_url)}" class="gh-link">&#128279;&nbsp;GitHub issue</a></div>`
      : '';

    return `
      <tr${rowCls}>
        <td class="col-num">${r.index}</td>
        <td class="col-title">${escHtml(r.title)}</td>
        <td class="col-result">${badge}</td>
        <td class="col-dur">${fmtDuration(r.duration_ms)}</td>
        <td class="col-notes">${r.notes ? escHtml(r.notes) : '<span class="muted">—</span>'}${ghLink}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Test Report — ${escHtml(report.suite_name)}</title>
  <style>
    /* ── Reset ───────────────────────────────────────────────────────────── */
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

    /* ── Base ────────────────────────────────────────────────────────────── */
    body{
      font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      font-size:14px;line-height:1.5;color:#111827;background:#f8fafc;
    }
    a{color:#4f46e5;text-decoration:none}
    a:hover{text-decoration:underline}
    .muted{color:#9ca3af}

    /* ── Page wrapper ────────────────────────────────────────────────────── */
    .page{
      max-width:900px;margin:2rem auto;background:#fff;
      border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;
    }

    /* ── Top banner ──────────────────────────────────────────────────────── */
    .banner{
      background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);
      padding:.6rem 2rem;
      display:flex;align-items:center;justify-content:space-between;
    }
    .banner-project{
      font-size:13px;font-weight:700;color:#c7d2fe;letter-spacing:.06em;
      text-transform:uppercase;
    }
    .banner-label{
      font-size:12px;font-weight:600;color:#a5b4fc;letter-spacing:.08em;
      text-transform:uppercase;
    }

    /* ── Report header ───────────────────────────────────────────────────── */
    .report-header{
      padding:1.75rem 2rem 1.5rem;
      border-bottom:1px solid #e5e7eb;
      display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;
    }
    .rh-left h1{
      font-size:20px;font-weight:700;color:#111827;margin-bottom:.4rem;
      line-height:1.25;
    }
    .rh-meta{font-size:13px;color:#6b7280}
    .rh-meta span+span::before{content:'·';margin:0 .5rem;color:#d1d5db}

    /* ── Status badge ────────────────────────────────────────────────────── */
    .status-badge{
      display:inline-block;padding:.35rem .9rem;border-radius:6px;
      font-size:13px;font-weight:700;letter-spacing:.06em;white-space:nowrap;
      flex-shrink:0;margin-top:.2rem;
    }
    .status-passed{background:#dcfce7;color:#15803d;border:1px solid #86efac}
    .status-failed{background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5}
    .status-pending{background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db}

    /* ── Summary section ─────────────────────────────────────────────────── */
    .summary-section{padding:1.5rem 2rem;border-bottom:1px solid #e5e7eb}
    .cards{display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.25rem}
    .card{
      flex:1 1 100px;border-radius:8px;padding:.9rem 1rem 1rem;
      text-align:center;border:1px solid #e5e7eb;
    }
    .card .n{font-size:28px;font-weight:700;line-height:1;margin-bottom:.25rem}
    .card .lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280}
    .card-pass{background:#f0fdf4;border-color:#86efac}.card-pass .n{color:#16a34a}
    .card-fail{background:#fef2f2;border-color:#fca5a5}.card-fail .n{color:#dc2626}
    .card-skip{background:#fffbeb;border-color:#fcd34d}.card-skip .n{color:#d97706}
    .card-tot {background:#eff6ff;border-color:#bfdbfe}.card-tot  .n{color:#1d4ed8}

    /* ── Pass rate bar ───────────────────────────────────────────────────── */
    .pr-row{display:flex;align-items:center;gap:1rem}
    .pr-label{font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;
              letter-spacing:.05em;white-space:nowrap;width:70px}
    .pr-track{flex:1;height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden}
    .pr-fill {height:100%;border-radius:99px;background:${passRateColor};
              width:${passRate}%;transition:width .3s}
    .pr-value{font-size:15px;font-weight:700;color:${passRateColor};width:46px;text-align:right}

    /* ── Results table ───────────────────────────────────────────────────── */
    .table-wrap{padding:0}
    table{width:100%;border-collapse:collapse;font-size:13px}
    .table-heading{
      padding:1rem 2rem .75rem;font-size:11px;font-weight:700;
      color:#6b7280;text-transform:uppercase;letter-spacing:.06em;
      border-bottom:1px solid #e5e7eb;
    }
    thead tr{background:#f9fafb}
    th{
      padding:9px 14px;text-align:left;font-size:11px;font-weight:600;
      color:#6b7280;text-transform:uppercase;letter-spacing:.05em;
      border-bottom:2px solid #e5e7eb;white-space:nowrap;
    }
    td{padding:11px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:#374151}
    tr:last-child td{border-bottom:none}
    .col-num  {width:36px;color:#9ca3af;font-size:12px}
    .col-title{font-weight:500;color:#111827}
    .col-result{width:115px}
    .col-dur  {width:90px;color:#6b7280;white-space:nowrap;font-size:12px}
    .col-notes{color:#6b7280;font-size:12px;max-width:220px}
    .row-failed {background:#fff5f5}
    .row-skipped{background:#fefce8}

    /* ── Badges ──────────────────────────────────────────────────────────── */
    .badge{
      display:inline-block;padding:3px 9px;border-radius:5px;
      font-size:12px;font-weight:600;white-space:nowrap;
    }
    .badge-passed {background:#dcfce7;color:#15803d}
    .badge-failed {background:#fee2e2;color:#b91c1c}
    .badge-skipped{background:#fef9c3;color:#a16207}
    .badge-pending{background:#f3f4f6;color:#9ca3af}
    .gh-link{font-size:11px;color:#4f46e5}

    /* ── Footer ──────────────────────────────────────────────────────────── */
    .report-footer{
      padding:1rem 2rem;border-top:1px solid #e5e7eb;background:#f9fafb;
      display:flex;align-items:center;justify-content:space-between;
      font-size:12px;color:#9ca3af;
    }
    .footer-left{display:flex;gap:.5rem;align-items:center}
    .footer-dot{color:#d1d5db}

    /* ── Print ───────────────────────────────────────────────────────────── */
    @media print{
      body{background:#fff;font-size:11px}
      .page{margin:0;border:none;border-radius:0;box-shadow:none}
      .banner{background:#4f46e5!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .card-pass,.card-fail,.card-skip,.card-tot,
      .row-failed,.row-skipped,
      .badge-passed,.badge-failed,.badge-skipped,.badge-pending,
      .status-passed,.status-failed,.pr-fill{
        -webkit-print-color-adjust:exact;print-color-adjust:exact
      }
      .cards{gap:.5rem}
      .card{padding:.6rem .75rem}
      .card .n{font-size:22px}
      table{font-size:10px}
      th,td{padding:6px 10px}
      tr{page-break-inside:avoid}
      thead{display:table-header-group}
      .pr-fill{print-color-adjust:exact}
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Top banner -->
  <div class="banner">
    <span class="banner-project">bootcamp&#8209;app</span>
    <span class="banner-label">Test Report</span>
  </div>

  <!-- Report header -->
  <div class="report-header">
    <div class="rh-left">
      <h1>${escHtml(report.suite_name)}</h1>
      <div class="rh-meta">
        <span>Run date: ${fmtDate(report.run_date)}</span>
        <span>Run #${report.run_id}</span>
        <span>Report #${report.id}</span>
      </div>
    </div>
    <div class="status-badge ${statusCls}">${statusLabel}</div>
  </div>

  <!-- Summary cards + pass rate -->
  <div class="summary-section">
    <div class="cards">
      <div class="card card-pass">
        <div class="n">${report.passed_count}</div>
        <div class="lbl">Passed</div>
      </div>
      <div class="card card-fail">
        <div class="n">${report.failed_count}</div>
        <div class="lbl">Failed</div>
      </div>
      <div class="card card-skip">
        <div class="n">${report.skipped_count}</div>
        <div class="lbl">Skipped</div>
      </div>
      <div class="card card-tot">
        <div class="n">${report.total_count}</div>
        <div class="lbl">Total</div>
      </div>
    </div>
    <div class="pr-row">
      <div class="pr-label">Pass rate</div>
      <div class="pr-track"><div class="pr-fill"></div></div>
      <div class="pr-value">${passRate}%</div>
    </div>
  </div>

  <!-- Results table -->
  <div class="table-wrap">
    <div class="table-heading">Test Case Results</div>
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
        ${rows || `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:2.5rem 0">No results recorded for this run.</td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="report-footer">
    <div class="footer-left">
      <strong style="color:#6b7280">bootcamp-app</strong>
      <span class="footer-dot">·</span>
      <span>Report #${report.id}</span>
      <span class="footer-dot">·</span>
      <span>Run #${report.run_id}</span>
    </div>
    <div>Generated: ${fmtDate(report.generated_at)}</div>
  </div>

</div>
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
