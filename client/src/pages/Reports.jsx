import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function passRate(report) {
  if (!report.total_count) return '—';
  return Math.round((report.passed_count / report.total_count) * 100) + '%';
}

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
  padding: '11px 12px',
  borderBottom: '1px solid #f3f4f6',
  color: '#374151',
  fontSize: 14,
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error ?? 'Failed to load reports');
        setReports(json.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Test Reports</h1>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '1rem 1.25rem', color: '#dc2626', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No reports yet</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>
              Open a <Link to="/test-runs" style={{ color: '#6366f1' }}>test run</Link> and click "Generate Report" to create one.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Suite</th>
                <th style={thStyle}>Run Date</th>
                <th style={thStyle}>Results</th>
                <th style={thStyle}>Pass Rate</th>
                <th style={thStyle}>Generated</th>
                <th style={{ ...thStyle, textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} style={{ cursor: 'default' }}>
                  <td style={{ ...tdStyle, color: '#9ca3af', width: 48 }}>{r.id}</td>
                  <td style={tdStyle}>
                    <Link to={`/reports/${r.id}`} style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
                      {r.suite_name}
                    </Link>
                  </td>
                  <td style={{ ...tdStyle, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(r.run_date)}</td>
                  <td style={tdStyle}>
                    <span style={{ color: '#16a34a', marginRight: 6 }}>{r.passed_count}✓</span>
                    <span style={{ color: '#dc2626', marginRight: 6 }}>{r.failed_count}✗</span>
                    {r.skipped_count > 0 && <span style={{ color: '#9ca3af' }}>{r.skipped_count}−</span>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontWeight: 600,
                      color: r.total_count === 0 ? '#9ca3af'
                        : r.passed_count === r.total_count ? '#16a34a'
                        : r.failed_count > 0 ? '#dc2626'
                        : '#d97706',
                    }}>
                      {passRate(r)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(r.generated_at)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <Link to={`/reports/${r.id}`} style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none' }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
