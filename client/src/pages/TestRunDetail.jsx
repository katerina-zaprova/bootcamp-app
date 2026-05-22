import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge';

const STATUS_STYLE = {
  pending: { bg: '#f3f4f6', text: '#6b7280' },
  running: { bg: '#dbeafe', text: '#1d4ed8' },
  passed:  { bg: '#dcfce7', text: '#15803d' },
  failed:  { bg: '#fee2e2', text: '#b91c1c' },
};

const RESULT_STYLE = {
  passed:  { bg: '#dcfce7', text: '#15803d' },
  failed:  { bg: '#fee2e2', text: '#b91c1c' },
  skipped: { bg: '#f3f4f6', text: '#6b7280' },
};

function StatusBadge({ status }) {
  const { bg, text } = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span style={{ background: bg, color: text, padding: '3px 12px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>
      {status}
    </span>
  );
}

function ResultBadge({ result }) {
  if (!result) return <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>—</span>;
  const { bg, text } = RESULT_STYLE[result];
  return (
    <span style={{ background: bg, color: text, padding: '2px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
      {result}
    </span>
  );
}

function fmt(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TestRunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/test-runs/${id}`);
      const json = await res.json();
      if (json.success) {
        setRun(json.data);
        setNotes(prev => {
          const next = {};
          json.data.results.forEach(r => { next[r.id] = prev[r.id] ?? r.notes ?? ''; });
          return next;
        });
      } else {
        setLoadError(json.error ?? 'Run not found.');
      }
    } catch {
      setLoadError('Could not reach the server.');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleUpdate(resultId, result) {
    setSaving(resultId);
    try {
      const res  = await fetch(`/api/test-runs/${id}/results/${resultId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, notes: notes[resultId] ?? '' }),
      });
      const json = await res.json();
      if (json.success) {
        setRun(json.data);
      }
    } finally {
      setSaving(null);
    }
  }

  if (loadError) return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => navigate('/test-runs')} style={backBtn}>← Test Runs</button>
      <p style={{ color: '#ef4444' }}>{loadError}</p>
    </div>
  );

  if (!run) return <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto', color: '#9ca3af' }}>Loading…</div>;

  const total = run.results.length;

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <button onClick={() => navigate('/test-runs')} style={backBtn}>← Test Runs</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>
            <Link to={`/test-suites/${run.suite_id}`} style={{ color: '#111', textDecoration: 'none' }}>{run.suite_name}</Link>
            {' '}<span style={{ color: '#9ca3af', fontWeight: 400 }}>— Run #{run.id}</span>
          </h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.875rem', color: '#6b7280' }}>
            <StatusBadge status={run.status} />
            <span>
              <span style={{ color: '#15803d', fontWeight: 500 }}>{run.pass_count} passed</span>
              {' · '}
              <span style={{ color: '#b91c1c', fontWeight: 500 }}>{run.fail_count} failed</span>
              {' · '}
              <span>{run.skip_count} skipped</span>
              {' · '}
              <span>{total} total</span>
            </span>
            {run.start_time && <span>Started {fmt(run.start_time)}</span>}
            {run.end_time   && <span>Ended {fmt(run.end_time)}</span>}
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
            <th style={{ ...th, width: 28 }}>#</th>
            <th style={th}>Test Case</th>
            <th style={{ ...th, width: 90 }}>Severity</th>
            <th style={{ ...th, width: 90 }}>Result</th>
            <th style={th}>Notes</th>
            <th style={{ ...th, width: 180 }}>Actions</th>
            <th style={{ ...th, width: 120 }}>Issue</th>
          </tr>
        </thead>
        <tbody>
          {run.results.map((r, i) => {
            const busy = saving === r.id;
            return (
              <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: r.result === 'failed' ? '#fff5f5' : '' }}>
                <td style={{ ...td, color: '#9ca3af' }}>{i + 1}</td>
                <td style={td}>{r.case_title}</td>
                <td style={td}><SeverityBadge severity={r.case_severity} /></td>
                <td style={td}><ResultBadge result={r.result} /></td>
                <td style={td}>
                  <input
                    value={notes[r.id] ?? ''}
                    onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Notes…"
                    style={{ border: '1px solid #d1d5db', borderRadius: 5, padding: '4px 8px', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => handleUpdate(r.id, 'passed')}  disabled={busy} style={{ ...actionBtn, background: r.result === 'passed'  ? '#15803d' : '#dcfce7', color: r.result === 'passed'  ? '#fff' : '#15803d' }}>{busy ? '…' : '✓ Pass'}</button>
                    <button onClick={() => handleUpdate(r.id, 'failed')}  disabled={busy} style={{ ...actionBtn, background: r.result === 'failed'  ? '#b91c1c' : '#fee2e2', color: r.result === 'failed'  ? '#fff' : '#b91c1c' }}>{busy ? '…' : '✗ Fail'}</button>
                    <button onClick={() => handleUpdate(r.id, 'skipped')} disabled={busy} style={{ ...actionBtn, background: r.result === 'skipped' ? '#6b7280' : '#f3f4f6', color: r.result === 'skipped' ? '#fff' : '#6b7280' }}>{busy ? '…' : '– Skip'}</button>
                  </div>
                </td>
                <td style={td}>
                  {r.github_issue_url
                    ? <a href={r.github_issue_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.8rem' }}>GitHub Issue</a>
                    : <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const backBtn   = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.875rem', padding: '0 0 16px', display: 'block' };
const th        = { padding: '10px 14px', textAlign: 'left', color: '#374151', fontWeight: 600 };
const td        = { padding: '10px 14px', verticalAlign: 'middle' };
const actionBtn = { border: 'none', borderRadius: 5, padding: '4px 9px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 };
