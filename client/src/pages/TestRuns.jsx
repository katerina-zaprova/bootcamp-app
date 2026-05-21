import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STATUS_STYLE = {
  pending: { bg: '#f3f4f6', text: '#6b7280' },
  running: { bg: '#dbeafe', text: '#1d4ed8' },
  passed:  { bg: '#dcfce7', text: '#15803d' },
  failed:  { bg: '#fee2e2', text: '#b91c1c' },
};

function StatusBadge({ status }) {
  const { bg, text } = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span style={{ background: bg, color: text, padding: '2px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
      {status}
    </span>
  );
}

function fmt(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TestRuns() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/test-runs')
      .then(r => r.json())
      .then(j => { if (j.success) setRuns(j.data); else setError(j.error); })
      .catch(() => setError('Could not reach the server.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: '#9ca3af' }}>Loading…</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.4rem' }}>Test Runs</h1>

      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {runs.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>No runs yet. Start one from a suite detail page.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={th}>#</th>
              <th style={th}>Suite</th>
              <th style={th}>Status</th>
              <th style={th}>Results</th>
              <th style={th}>Cases</th>
              <th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => (
              <tr key={run.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>
                  <Link to={`/test-runs/${run.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                    #{run.id}
                  </Link>
                </td>
                <td style={td}>
                  <Link to={`/test-suites/${run.suite_id}`} style={{ color: '#374151', textDecoration: 'none' }}>
                    {run.suite_name}
                  </Link>
                </td>
                <td style={td}><StatusBadge status={run.status} /></td>
                <td style={td}>
                  <span style={{ color: '#15803d', fontWeight: 500 }}>{run.pass_count}✓</span>
                  {' · '}
                  <span style={{ color: '#b91c1c', fontWeight: 500 }}>{run.fail_count}✗</span>
                  {' · '}
                  <span style={{ color: '#6b7280' }}>{run.skip_count}–</span>
                </td>
                <td style={{ ...td, color: '#6b7280' }}>{run.total_cases}</td>
                <td style={{ ...td, color: '#6b7280' }}>{fmt(run.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', color: '#374151', fontWeight: 600 };
const td = { padding: '12px 14px', verticalAlign: 'middle' };
