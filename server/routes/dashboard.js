const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/metrics', (req, res) => {
  try {
    const totalCases = db.prepare('SELECT COUNT(*) as count FROM test_cases').get().count;

    const runStats = db.prepare(`
      SELECT
        SUM(pass_count) as total_pass,
        SUM(pass_count + fail_count + skip_count) as total_scored,
        AVG(
          CASE
            WHEN start_time IS NOT NULL AND end_time IS NOT NULL
            THEN (julianday(end_time) - julianday(start_time)) * 86400000
            ELSE NULL
          END
        ) as avg_duration_ms
      FROM test_runs_v2
      WHERE status IN ('passed', 'failed')
    `).get();

    const passRate = runStats.total_scored > 0
      ? Math.round((runStats.total_pass / runStats.total_scored) * 1000) / 10
      : null;

    const avgDuration = runStats.avg_duration_ms != null
      ? Math.round(runStats.avg_duration_ms)
      : null;

    const openBugs = db.prepare(
      "SELECT COUNT(*) as count FROM bugs WHERE status NOT IN ('resolved', 'closed')"
    ).get().count;

    const recentRuns = db.prepare(`
      SELECT
        r.id,
        r.status,
        r.pass_count,
        r.fail_count,
        r.skip_count,
        r.start_time,
        r.end_time,
        r.created_at,
        s.name as suite_name
      FROM test_runs_v2 r
      JOIN test_suites s ON s.id = r.suite_id
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all();

    const recentActivity = db.prepare(`
      SELECT
        a.id,
        a.bug_id,
        a.action,
        a.old_value,
        a.new_value,
        a.created_at,
        b.title as bug_title
      FROM bug_activity a
      JOIN bugs b ON b.id = a.bug_id
      ORDER BY a.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        metrics: {
          totalCases,
          passRate,
          openBugs,
          avgDurationMs: avgDuration,
        },
        recentRuns,
        recentActivity,
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

module.exports = router;
