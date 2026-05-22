import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const REFRESH_MS = 30_000;

function formatDuration(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function formatRelative(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatActivity(item) {
  const label = `Bug #${item.bug_id}`;
  switch (item.action) {
    case 'status_changed':
      return `${label} status changed to ${item.new_value}`;
    case 'severity_changed':
      return `${label} severity changed to ${item.new_value}`;
    case 'assigned':
      return `${label} assigned to ${item.new_value || 'nobody'}`;
    case 'created':
      return `${label} created: ${item.bug_title}`;
    case 'resolved':
      return `${label} marked resolved`;
    case 'closed':
      return `${label} closed`;
    case 'reopened':
      return `${label} reopened`;
    case 'commented':
      return `${label} commented on`;
    default:
      return `${label}: ${item.action}${item.new_value ? ` → ${item.new_value}` : ''}`;
  }
}

const STATUS_COLOR = {
  passed: '#16a34a',
  failed: '#dc2626',
  running: '#d97706',
  pending: '#6b7280',
};

function StatusBadge({ status }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
      color: '#fff',
      background: STATUS_COLOR[status] ?? '#6b7280',
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '1.25rem 1.5rem',
      flex: '1 1 180px',
      minWidth: 160,
    }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: '#f3f4f6',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '1.25rem 1.5rem',
      flex: '1 1 180px',
      minWidth: 160,
      height: 96,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '10px 12px' }}>
          <div style={{
            height: 14,
            borderRadius: 4,
            background: '#e5e7eb',
            width: i === 0 ? '60%' : '40%',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        </td>
      ))}
    </tr>
  );
}

// ── SVG chart helpers ──────────────────────────────────────────────────────────

function polarToCartesian(cx, cy, r, deg) {
  const rad = (deg - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const end = Math.min(endDeg, startDeg + 359.99);
  const [sx, sy] = polarToCartesian(cx, cy, r, startDeg);
  const [ex, ey] = polarToCartesian(cx, cy, r, end);
  const large = (end - startDeg) > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

function LegendItem({ color, label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: '#374151' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto', paddingLeft: 8 }}>{count}</span>
    </div>
  );
}

function DonutChart({ passed, failed, skipped }) {
  const total = passed + failed + skipped;
  const cx = 62, cy = 62, r = 46, sw = 14;

  if (total === 0) {
    return (
      <svg width={124} height={124}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill="#9ca3af">No data</text>
      </svg>
    );
  }

  const passRate = Math.round((passed / total) * 100);
  const rateColor = passRate >= 80 ? '#16a34a' : passRate >= 50 ? '#d97706' : '#dc2626';

  const segments = [];
  let cursor = 0;
  const addSeg = (count, color) => {
    if (count <= 0) return;
    const span = (count / total) * 360;
    segments.push({ d: arcPath(cx, cy, r, cursor, cursor + span), color });
    cursor += span;
  };
  addSeg(passed, '#16a34a');
  addSeg(failed, '#dc2626');
  addSeg(skipped, '#d97706');

  return (
    <svg width={124} height={124}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
      {segments.map((seg, i) => (
        <path key={i} d={seg.d} fill="none" stroke={seg.color} strokeWidth={sw} strokeLinecap="butt" />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight="700" fill={rateColor}>{passRate}%</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize={10} fill="#9ca3af">pass rate</text>
    </svg>
  );
}

function TrendChart({ runs }) {
  const data = [...runs].reverse();
  const W = 360, H = 124;
  const padL = 30, padR = 10, padT = 14, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  if (data.length === 0) {
    return (
      <div style={{ width: '100%', height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>
        No runs yet
      </div>
    );
  }

  const barW = Math.max(8, Math.min(36, chartW / data.length - 6));
  const spacing = chartW / data.length;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {[0, 50, 100].map(v => {
        const y = padT + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line x1={padL} x2={padL + chartW} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize={9} fill="#9ca3af">{v}%</text>
          </g>
        );
      })}
      <line x1={padL} x2={padL + chartW} y1={padT + chartH} y2={padT + chartH} stroke="#e5e7eb" strokeWidth={1} />
      {data.map((run, i) => {
        const tot = run.pass_count + run.fail_count + run.skip_count;
        const rate = tot > 0 ? run.pass_count / tot : 0;
        const bh = Math.max(rate * chartH, tot > 0 ? 2 : 0);
        const x = padL + i * spacing + (spacing - barW) / 2;
        const y = padT + chartH - bh;
        const color = rate >= 0.8 ? '#16a34a' : rate >= 0.5 ? '#d97706' : '#dc2626';
        return (
          <g key={run.id}>
            {bh > 0 && <rect x={x} y={y} width={barW} height={bh} fill={color} rx={2} opacity={0.85} />}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">#{run.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Coverage colours (status → hex) ──────────────────────────────────────────
const COVERAGE_COLOR = {
  passed:   '#16a34a',
  failed:   '#dc2626',
  skipped:  '#d97706',
  pending:  '#6b7280',
  untested: '#cbd5e1',
};

// ── Pass-rate line chart ───────────────────────────────────────────────────────
function PassRateLineChart({ data }) {
  const VW = 320, VH = 140;
  const pL = 34, pR = 12, pT = 14, pB = 32;
  const cW = VW - pL - pR, cH = VH - pT - pB;

  if (!data || data.length === 0) {
    return (
      <div style={{ height: VH, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>
        No completed runs yet
      </div>
    );
  }

  const n = data.length;
  const xStep = n < 2 ? cW : cW / (n - 1);
  const pts = data.map((d, i) => [
    pL + (n < 2 ? cW / 2 : i * xStep),
    pT + cH - (d.pass_rate / 100) * cH,
  ]);

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const areaPath = `M ${pts[0][0].toFixed(1)} ${(pT + cH).toFixed(1)} `
    + pts.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
    + ` L ${pts[pts.length - 1][0].toFixed(1)} ${(pT + cH).toFixed(1)} Z`;

  const fmtXLabel = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const yTicks = [0, 25, 50, 75, 100];
  const labelStep = Math.max(1, Math.ceil(n / 6));

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map(v => {
        const y = pT + cH - (v / 100) * cH;
        return (
          <g key={v}>
            <line x1={pL} x2={pL + cW} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={0.8} />
            <text x={pL - 4} y={y + 4} textAnchor="end" fontSize={8} fill="#9ca3af">{v}%</text>
          </g>
        );
      })}
      <line x1={pL} x2={pL + cW} y1={pT + cH} y2={pT + cH} stroke="#e5e7eb" strokeWidth={0.8} />
      <path d={areaPath} fill="url(#lineArea)" />
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => {
        const rate = data[i].pass_rate;
        const color = rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626';
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill="#fff" stroke={color} strokeWidth={1.5} />
            {i % labelStep === 0 && (
              <text x={x} y={VH - 4} textAnchor="middle" fontSize={7.5} fill="#9ca3af">
                {fmtXLabel(data[i].created_at)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Bugs opened vs closed grouped bar chart ────────────────────────────────────
function BugsWeeklyChart({ data }) {
  const VW = 320, VH = 140;
  const pL = 28, pR = 8, pT = 14, pB = 32;
  const cW = VW - pL - pR, cH = VH - pT - pB;

  const isEmpty = !data || data.length === 0 || data.every(w => w.opened === 0 && w.closed === 0);
  if (!data || data.length === 0) {
    return (
      <div style={{ height: VH, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>
        No bug data yet
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.flatMap(w => [w.opened, w.closed]));
  const n = data.length;
  const groupW = cW / n;
  const barW = Math.max(3, Math.min(12, (groupW - 4) / 2));
  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ overflow: 'visible' }}>
      {yTicks.map(v => {
        const y = pT + cH - (v / maxVal) * cH;
        return (
          <g key={v}>
            <line x1={pL} x2={pL + cW} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={0.8} />
            <text x={pL - 4} y={y + 4} textAnchor="end" fontSize={8} fill="#9ca3af">{v}</text>
          </g>
        );
      })}
      <line x1={pL} x2={pL + cW} y1={pT + cH} y2={pT + cH} stroke="#e5e7eb" strokeWidth={0.8} />
      {data.map((w, i) => {
        const gx = pL + i * groupW + (groupW - barW * 2 - 2) / 2;
        const oh = (w.opened / maxVal) * cH;
        const ch = (w.closed / maxVal) * cH;
        return (
          <g key={w.week_start}>
            {w.opened > 0 && <rect x={gx} y={pT + cH - oh} width={barW} height={oh} fill="#6366f1" rx={1.5} opacity={0.85} />}
            {w.closed > 0 && <rect x={gx + barW + 2} y={pT + cH - ch} width={barW} height={ch} fill="#16a34a" rx={1.5} opacity={0.85} />}
            <text x={gx + barW + 1} y={VH - 4} textAnchor="middle" fontSize={7} fill="#9ca3af">{w.week_label}</text>
          </g>
        );
      })}
      {/* Legend */}
      <g>
        <rect x={pL} y={3} width={7} height={7} fill="#6366f1" rx={1} />
        <text x={pL + 9} y={10} fontSize={8} fill="#6b7280">Opened</text>
        <rect x={pL + 52} y={3} width={7} height={7} fill="#16a34a" rx={1} />
        <text x={pL + 61} y={10} fontSize={8} fill="#6b7280">Closed</text>
      </g>
    </svg>
  );
}

// ── Coverage donut (by latest test-case result) ────────────────────────────────
function CoverageDonutChart({ data }) {
  const cx = 58, cy = 58, r = 44, sw = 13;
  const order = ['passed', 'failed', 'skipped', 'pending', 'untested'];

  const sorted = order
    .map(s => data?.find(d => d.status === s))
    .filter(Boolean)
    .concat((data ?? []).filter(d => !order.includes(d.status)));

  const total = sorted.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <svg width={116} height={116}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill="#9ca3af">No data</text>
      </svg>
    );
  }

  const segments = [];
  let cursor = 0;
  for (const d of sorted) {
    if (d.count <= 0) continue;
    const span = (d.count / total) * 360;
    segments.push({ d: arcPath(cx, cy, r, cursor, cursor + span), color: COVERAGE_COLOR[d.status] ?? '#e5e7eb' });
    cursor += span;
  }

  return (
    <svg width={116} height={116}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
      {segments.map((seg, i) => (
        <path key={i} d={seg.d} fill="none" stroke={seg.color} strokeWidth={sw} strokeLinecap="butt" />
      ))}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={17} fontWeight="700" fill="#111827">{total}</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize={9} fill="#9ca3af">test cases</text>
    </svg>
  );
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  borderBottom: '1px solid #e5e7eb',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid #f3f4f6',
  color: '#374151',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trends, setTrends] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/metrics');
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to load metrics');
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/trends');
      const json = await res.json();
      if (json.success) setTrends(json.data);
    } catch (_) { /* non-fatal */ }
  }, []);

  useEffect(() => {
    fetchData();
    fetchTrends();
    const timer = setInterval(() => { fetchData(); fetchTrends(); }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchData, fetchTrends]);

  const metrics = data?.metrics;
  const runs = data?.recentRuns ?? [];
  const activity = data?.recentActivity ?? [];

  const totalPassed  = runs.reduce((s, r) => s + r.pass_count, 0);
  const totalFailed  = runs.reduce((s, r) => s + r.fail_count, 0);
  const totalSkipped = runs.reduce((s, r) => s + r.skip_count, 0);

  const isEmpty = !loading && !error && data &&
    runs.length === 0 && activity.length === 0 && metrics?.totalCases === 0;

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Dashboard</h1>
        {!loading && !error && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Auto-refreshes every 30s</span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '1rem 1.25rem',
          color: '#dc2626',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontWeight: 600 }}>Failed to load:</span> {error}
          <button
            onClick={fetchData}
            style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 4, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              label="Total Test Cases"
              value={metrics?.totalCases ?? '—'}
              sub={metrics?.totalCases === 0 ? 'Add test cases to a suite to start tracking' : undefined}
            />
            <MetricCard
              label="Pass Rate"
              value={metrics?.passRate != null ? `${metrics.passRate}%` : '—'}
              sub={metrics?.passRate == null ? 'Run a test suite to track your pass rate' : undefined}
            />
            <MetricCard
              label="Open Bugs"
              value={metrics?.openBugs ?? '—'}
              sub={metrics?.openBugs === 0 ? 'No open bugs — all clear!' : undefined}
            />
            <MetricCard
              label="Avg Run Duration"
              value={formatDuration(metrics?.avgDurationMs)}
              sub={metrics?.avgDurationMs == null ? 'Complete a run to see average timing' : undefined}
            />
          </>
        )}
      </div>

      {/* Charts row */}
      {!loading && !isEmpty && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

          {/* Donut — result distribution */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Result Distribution
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <DonutChart passed={totalPassed} failed={totalFailed} skipped={totalSkipped} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <LegendItem color="#16a34a" label="Passed"  count={totalPassed} />
                <LegendItem color="#dc2626" label="Failed"  count={totalFailed} />
                <LegendItem color="#d97706" label="Skipped" count={totalSkipped} />
              </div>
            </div>
          </div>

          {/* Bar — pass rate per run */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Pass Rate Trend — last {runs.length} run{runs.length !== 1 ? 's' : ''}
            </div>
            <TrendChart runs={runs} />
          </div>

        </div>
      )}

      {/* Trends charts row */}
      {trends && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: '1rem', marginBottom: '1.5rem' }}>

          {/* Line chart — pass rate over last 10 runs */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Pass Rate Trend — last 10 runs
            </div>
            <PassRateLineChart data={trends.passRateTrend} />
          </div>

          {/* Grouped bar — bugs opened vs closed per week */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Bugs Opened vs Closed — last 8 weeks
            </div>
            <BugsWeeklyChart data={trends.bugsWeekly} />
          </div>

          {/* Coverage donut — test cases by status */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Test Coverage
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CoverageDonutChart data={trends.coverageByStatus} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                {(trends.coverageByStatus ?? []).map(d => (
                  <LegendItem
                    key={d.status}
                    color={COVERAGE_COLOR[d.status] ?? '#e5e7eb'}
                    label={d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                    count={d.count}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#9ca3af',
          background: '#f9fafb',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#6b7280' }}>No data yet</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Add test cases and run a suite to see results here.
          </div>
        </div>
      )}

      {/* Two-column layout for tables */}
      {!isEmpty && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>

          {/* Recent test runs */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Recent Test Runs</h2>
              <Link to="/test-runs" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none' }}>View all →</Link>
            </div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Suite</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Results</th>
                  <th style={thStyle}>When</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                  : runs.length === 0
                    ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '2.5rem 1.25rem', textAlign: 'center', borderBottom: 'none' }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>▶</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                            No test runs yet
                          </div>
                          <div style={{ fontSize: 13, color: '#9ca3af' }}>
                            Open a <Link to="/test-suites" style={{ color: '#6366f1' }}>test suite</Link> and click ▶ New Run to get started.
                          </div>
                        </td>
                      </tr>
                    )
                    : runs.map(run => (
                      <tr key={run.id}>
                        <td style={tdStyle}>
                          <Link to={`/test-runs/${run.id}`} style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
                            {run.suite_name}
                          </Link>
                        </td>
                        <td style={tdStyle}><StatusBadge status={run.status} /></td>
                        <td style={tdStyle}>
                          <span style={{ color: '#16a34a' }}>{run.pass_count}✓</span>
                          {' '}
                          <span style={{ color: '#dc2626' }}>{run.fail_count}✗</span>
                          {run.skip_count > 0 && <span style={{ color: '#9ca3af' }}> {run.skip_count}−</span>}
                        </td>
                        <td style={{ ...tdStyle, color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {formatRelative(run.created_at)}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Recent activity */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Recent Activity</h2>
              <Link to="/bugs" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none' }}>View bugs →</Link>
            </div>
            {loading ? (
              <div style={{ padding: '0.5rem 0' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ padding: '12px 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 13, borderRadius: 4, background: '#e5e7eb', width: '70%', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <div style={{ height: 11, borderRadius: 4, background: '#e5e7eb', width: '30%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  No activity yet
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>
                  Status updates, severity changes, and comments on{' '}
                  <Link to="/bugs" style={{ color: '#6366f1' }}>bugs</Link>{' '}
                  will appear here.
                </div>
              </div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {activity.map(item => (
                  <li key={item.id} style={{
                    padding: '12px 1.25rem',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#e0e7ff',
                      color: '#6366f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      #{item.bug_id}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, color: '#374151' }}>
                        {formatActivity(item)}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                        {formatRelative(item.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
