const express = require('express');
const db = require('../db');

const router = express.Router();
const VALID_RESULTS = ['passed', 'failed', 'skipped'];

async function createGitHubIssue(title, body) {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_ISSUE_REPO;
  if (!token || !repo) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.html_url ?? null;
  } catch {
    return null;
  }
}

function getRun(id) {
  const run = db.prepare(`
    SELECT r.*, s.name AS suite_name, s.feature AS suite_feature
    FROM test_runs_v2 r
    JOIN test_suites s ON s.id = r.suite_id
    WHERE r.id = ?
  `).get(id);
  if (!run) return null;
  const results = db.prepare(`
    SELECT rr.*, tc.title AS case_title, tc.severity AS case_severity
    FROM test_run_results rr
    JOIN test_cases tc ON tc.id = rr.test_case_id
    WHERE rr.run_id = ?
    ORDER BY rr.id ASC
  `).all(id);
  return { ...run, results };
}

function recalcRun(runId) {
  const results = db.prepare('SELECT result FROM test_run_results WHERE run_id = ?').all(runId);
  const pass_count = results.filter(r => r.result === 'passed').length;
  const fail_count = results.filter(r => r.result === 'failed').length;
  const skip_count = results.filter(r => r.result === 'skipped').length;
  const scored = pass_count + fail_count + skip_count;
  const total  = results.length;

  const run = db.prepare('SELECT status, start_time FROM test_runs_v2 WHERE id = ?').get(runId);
  let status     = run.status;
  let start_time = run.start_time;
  let end_time   = null;

  if (scored > 0 && !start_time) start_time = new Date().toISOString();
  if (scored === total && total > 0) {
    status   = fail_count > 0 ? 'failed' : 'passed';
    end_time = new Date().toISOString();
  } else if (scored > 0) {
    status = 'running';
  }

  db.prepare(`
    UPDATE test_runs_v2
    SET pass_count=?, fail_count=?, skip_count=?, status=?, start_time=?, end_time=?
    WHERE id=?
  `).run(pass_count, fail_count, skip_count, status, start_time, end_time, runId);
}

function handleListRuns(req, res) {
  const rows = db.prepare(`
    SELECT r.*, s.name AS suite_name, COUNT(rr.id) AS total_cases
    FROM test_runs_v2 r
    JOIN test_suites s ON s.id = r.suite_id
    LEFT JOIN test_run_results rr ON rr.run_id = r.id
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ success: true, data: rows, error: null });
}

function handleCreateRun(req, res) {
  const { suite_id, created_by } = req.body;
  if (!suite_id) return res.status(400).json({ success: false, data: null, error: 'suite_id is required.' });

  const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(suite_id);
  if (!suite) return res.status(404).json({ success: false, data: null, error: 'Suite not found.' });

  const suiteCases = db.prepare('SELECT test_case_id FROM suite_cases WHERE suite_id = ? ORDER BY sort_order ASC').all(suite_id);
  if (suiteCases.length === 0) {
    return res.status(422).json({ success: false, data: null, error: 'Suite has no test cases.' });
  }

  const runId = db.transaction(() => {
    const run = db.prepare(`
      INSERT INTO test_runs_v2 (suite_id, status, created_by) VALUES (?, 'pending', ?)
    `).run(suite_id, created_by ?? null);
    const insertResult = db.prepare('INSERT INTO test_run_results (run_id, test_case_id) VALUES (?, ?)');
    for (const sc of suiteCases) insertResult.run(run.lastInsertRowid, sc.test_case_id);
    return run.lastInsertRowid;
  })();

  res.status(201).json({ success: true, data: getRun(runId), error: null });
}

function handleGetRun(req, res) {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ success: false, data: null, error: 'Run not found.' });
  res.json({ success: true, data: run, error: null });
}

async function handleUpdateResult(req, res) {
  const { id, resultId } = req.params;

  const result = db.prepare('SELECT * FROM test_run_results WHERE id = ? AND run_id = ?').get(resultId, id);
  if (!result) return res.status(404).json({ success: false, data: null, error: 'Result not found.' });

  const { result: newResult, notes, duration_ms } = req.body;
  if (!newResult || !VALID_RESULTS.includes(newResult)) {
    return res.status(400).json({ success: false, data: null, error: `result must be one of: ${VALID_RESULTS.join(', ')}.` });
  }

  let github_issue_url = result.github_issue_url;
  const failed_at = newResult === 'failed' ? new Date().toISOString() : null;

  if (newResult === 'failed' && !result.github_issue_url) {
    const tc = db.prepare('SELECT title FROM test_cases WHERE id = ?').get(result.test_case_id);
    const issueTitle = tc?.title ?? `Test case #${result.test_case_id} failed`;
    const issueBody  = notes?.trim()
      ? `**Failure notes:**\n\n${notes.trim()}`
      : 'No failure notes provided.';
    github_issue_url = await createGitHubIssue(issueTitle, issueBody);
  }

  db.prepare(`
    UPDATE test_run_results
    SET result=?, notes=?, duration_ms=?, failed_at=?, github_issue_url=?
    WHERE id=?
  `).run(
    newResult,
    notes !== undefined ? notes : result.notes,
    duration_ms !== undefined ? duration_ms : result.duration_ms,
    failed_at,
    github_issue_url,
    resultId,
  );

  recalcRun(id);
  res.json({ success: true, data: getRun(id), error: null });
}

router.get('/',                            handleListRuns);
router.post('/',                           handleCreateRun);
router.get('/:id',                         handleGetRun);
router.patch('/:id/results/:resultId',     handleUpdateResult);

module.exports = router;
