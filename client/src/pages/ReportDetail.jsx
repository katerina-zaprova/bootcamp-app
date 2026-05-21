import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

const RESULT_STYLE = {
  passed:  { background: '#dcfce7', color: '#16a34a', label: '✓ Passed' },
  failed:  { background: '#fee2e2', color: '#dc2626', label: '✗ Failed' },
  skipped: { background: '#f3f4f6', color: '#6b7280', label: '− Skipped' },
  pending: { background: '#f3f4f6', color: '#9ca3af', label: '○ Pending' },
};

function ResultBadge({ result }) {
  const s = RESULT_STYLE[result] ?? RESULT_STYLE.pending;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
      background: s.background,
      color: s.color,
    }}>
      {s.label}
    </span>
  );
}

function SummaryCard({ value, label, valueColor }) {
  return (
    <div style={{
      flex: '1 1 100px',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '.75rem 1rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: valueColor, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{label}</div>
    </div>
  );
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
  padding: '10px 12px',
  borderBottom: '1px solid #f3f4f6',
  fontSize: 13,
  verticalAlign: 'top',
};

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error ?? 'Failed to load report');
        setReport(json.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto', color: '#9ca3af' }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '1rem 1.25rem', color: '#dc2626' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const results = Array.isArray(report.results) ? report.results : [];
  const passRate = report.total_count > 0
    ? Math.round((report.passed_count / report.total_count) * 100)
    : 0;

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: '1rem' }}>
        <Link to="/reports" style={{ color: '#6366f1', textDecoration: 'none' }}>Reports</Link>
        {' / '}Report #{report.id}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{report.suite_name}</h1>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Run: {formatDate(report.run_date)}&nbsp;&nbsp;·&nbsp;&nbsp;Generated: {formatDate(report.generated_at)}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <a
            href={`/api/reports/${id}/export/html`}
            download
            style={{
              display: 'inline-block',
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #6366f1',
              color: '#6366f1',
              background: '#fff',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            ⬇ Download HTML
          </a>
          <button
            onClick={() => window.open(`/api/reports/${id}/export/html`, '_blank')}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🖨 Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <SummaryCard value={report.passed_count}  label="Passed"  valueColor="#16a34a" />
        <SummaryCard value={report.failed_count}  label="Failed"  valueColor="#dc2626" />
        <SummaryCard value={report.skipped_count} label="Skipped" valueColor="#6b7280" />
        <SummaryCard value={report.total_count}   label="Total"   valueColor="#1d4ed8" />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: '2rem' }}>
        Pass rate:{' '}
        <span style={{ color: passRate === 100 ? '#16a34a' : passRate >= 70 ? '#d97706' : '#dc2626' }}>
          {passRate}%
        </span>
      </div>

      {/* Results table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {results.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af' }}>
            No results were recorded for this run.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 40 }}>#</th>
                <th style={thStyle}>Test Case</th>
                <th style={{ ...thStyle, width: 110 }}>Result</th>
                <th style={{ ...thStyle, width: 90 }}>Duration</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.index} style={{ background: r.result === 'failed' ? '#fff7f7' : undefined }}>
                  <td style={{ ...tdStyle, color: '#9ca3af' }}>{r.index}</td>
                  <td style={{ ...tdStyle, color: '#111827', fontWeight: 500 }}>{r.title}</td>
                  <td style={tdStyle}><ResultBadge result={r.result} /></td>
                  <td style={{ ...tdStyle, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDuration(r.duration_ms)}</td>
                  <td style={{ ...tdStyle, color: '#6b7280' }}>
                    {r.notes || '—'}
                    {r.github_issue_url && (
                      <div style={{ marginTop: 4 }}>
                        <a href={r.github_issue_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none' }}>
                          GitHub issue ↗
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '1.5rem', fontSize: 12, color: '#9ca3af' }}>
        Report #{report.id} &nbsp;·&nbsp; Run #{report.run_id}
      </div>
    </div>
  );
}
