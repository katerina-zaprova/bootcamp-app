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

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  const metrics = data?.metrics;
  const runs = data?.recentRuns ?? [];
  const activity = data?.recentActivity ?? [];

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
            <MetricCard label="Total Test Cases" value={metrics?.totalCases ?? '—'} />
            <MetricCard
              label="Pass Rate"
              value={metrics?.passRate != null ? `${metrics.passRate}%` : '—'}
              sub={metrics?.passRate == null ? 'No completed runs yet' : undefined}
            />
            <MetricCard label="Open Bugs" value={metrics?.openBugs ?? '—'} />
            <MetricCard
              label="Avg Run Duration"
              value={formatDuration(metrics?.avgDurationMs)}
              sub={metrics?.avgDurationMs == null ? 'No timed runs yet' : undefined}
            />
          </>
        )}
      </div>

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
                        <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                          No runs yet
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
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No activity yet</div>
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
