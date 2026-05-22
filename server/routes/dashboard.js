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

router.get('/trends', (req, res) => {
  try {
    // ── 1. Pass-rate trend — last 10 completed runs ───────────────────────
    const passRateTrend = db.prepare(`
      SELECT r.id, r.pass_count, r.fail_count, r.skip_count, r.created_at,
             s.name as suite_name
      FROM test_runs_v2 r
      JOIN test_suites s ON s.id = r.suite_id
      WHERE r.status IN ('passed', 'failed')
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all().reverse().map(r => {
      const total = r.pass_count + r.fail_count + r.skip_count;
      return {
        id: r.id,
        suite_name: r.suite_name,
        created_at: r.created_at,
        pass_rate: total > 0 ? Math.round((r.pass_count / total) * 100) : 0,
      };
    });

    // ── 2. Bugs opened vs closed — last 8 weeks ───────────────────────────
    // Pull raw dates and group in JS to avoid SQLite week-number quirks
    const recentBugs = db.prepare(`
      SELECT date(created_at) as d FROM bugs
      WHERE created_at >= datetime('now', '-56 days')
    `).all();

    const recentClosed = db.prepare(`
      SELECT date(created_at) as d FROM bug_activity
      WHERE action = 'status_changed'
        AND new_value IN ('resolved', 'closed')
        AND created_at >= datetime('now', '-56 days')
    `).all();

    function toMonday(dateStr) {
      const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00Z' : dateStr);
      const dow = d.getUTCDay();
      d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
      return d.toISOString().slice(0, 10);
    }

    const today = new Date();
    const rawWeeks = [];
    for (let i = 7; i >= 0; i--) {
      rawWeeks.push(toMonday(new Date(today.getTime() - i * 7 * 86_400_000)));
    }
    const uniqueWeeks = [...new Set(rawWeeks)].slice(-8);

    const openedByWeek = Object.fromEntries(uniqueWeeks.map(w => [w, 0]));
    const closedByWeek = Object.fromEntries(uniqueWeeks.map(w => [w, 0]));

    for (const { d } of recentBugs) {
      const w = toMonday(d);
      if (w in openedByWeek) openedByWeek[w]++;
    }
    for (const { d } of recentClosed) {
      const w = toMonday(d);
      if (w in closedByWeek) closedByWeek[w]++;
    }

    const bugsWeekly = uniqueWeeks.map(w => {
      const d = new Date(w + 'T00:00:00Z');
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      return { week_start: w, week_label: label, opened: openedByWeek[w], closed: closedByWeek[w] };
    });

    // ── 3. Test coverage — most recent result per test case ───────────────
    const coverageByStatus = db.prepare(`
      SELECT
        COALESCE(rr.result, 'untested') as status,
        COUNT(*) as count
      FROM test_cases tc
      LEFT JOIN (
        SELECT test_case_id, result
        FROM test_run_results
        WHERE id IN (
          SELECT MAX(id) FROM test_run_results GROUP BY test_case_id
        )
      ) rr ON rr.test_case_id = tc.id
      GROUP BY COALESCE(rr.result, 'untested')
      ORDER BY count DESC
    `).all();

    res.json({
      success: true,
      data: { passRateTrend, bugsWeekly, coverageByStatus },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

module.exports = router;
