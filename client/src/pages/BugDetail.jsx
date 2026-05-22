import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge';
import BugModal from '../components/BugModal';

const STATUS_TRANSITIONS = {
  'open':        ['in-progress', 'closed'],
  'in-progress': ['resolved', 'closed'],
  'resolved':    ['closed', 'reopened'],
  'closed':      ['reopened'],
  'reopened':    ['in-progress', 'closed'],
};

const STATUS_STYLE = {
  'open':        { bg: '#fee2e2', text: '#b91c1c' },
  'in-progress': { bg: '#dbeafe', text: '#1d4ed8' },
  'resolved':    { bg: '#dcfce7', text: '#15803d' },
  'closed':      { bg: '#f3f4f6', text: '#374151' },
  'reopened':    { bg: '#fef9c3', text: '#854d0e' },
};

function StatusBadge({ status }) {
  const { bg, text } = STATUS_STYLE[status] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <span style={{ background: bg, color: text, padding: '3px 12px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

export default function BugDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bug, setBug] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await fetch(`/api/bugs/${id}`);
      const json = await res.json();
      if (json.success) {
        setBug(json.data);
        setNextStatus('');
      } else {
        setLoadError(json.error ?? 'Failed to load bug.');
      }
    } catch {
      setLoadError('Could not reach the server.');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(e) {
    e.preventDefault();
    if (!nextStatus) return;
    setStatusError('');
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/bugs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, message: statusNote.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setBug(json.data);
        setNextStatus('');
        setStatusNote('');
      } else {
        setStatusError(json.error ?? 'Status change failed.');
      }
    } catch {
      setStatusError('Could not reach the server.');
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!comment.trim()) { setCommentError('Comment cannot be empty.'); return; }
    setCommentError('');
    setCommentSaving(true);
    try {
      const res = await fetch(`/api/bugs/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: comment.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setBug(b => ({ ...b, activity: json.data }));
        setComment('');
      } else {
        setCommentError(json.error ?? 'Failed to add comment.');
      }
    } catch {
      setCommentError('Could not reach the server.');
    } finally {
      setCommentSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this bug? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/bugs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { navigate('/bugs'); }
      else { alert(json.error ?? 'Delete failed.'); }
    } catch {
      alert('Could not reach the server.');
    }
  }

  if (loadError) return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate('/bugs')} style={backBtn}>← Bugs</button>
      <p style={{ color: '#ef4444' }}>{loadError}</p>
    </div>
  );

  if (!bug) return <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto', color: '#9ca3af' }}>Loading…</div>;

  const allowed = STATUS_TRANSITIONS[bug.status] ?? [];

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={() => navigate('/bugs')} style={backBtn}>← Bugs</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', lineHeight: 1.4, flex: 1 }}>{bug.title}</h1>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setEditOpen(true)} style={ghostBtn}>Edit</button>
          <button onClick={handleDelete} style={dangerBtn}>Delete</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <SeverityBadge severity={bug.severity} />
        <StatusBadge status={bug.status} />
        {bug.environment && (
          <span style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 10px', borderRadius: '9999px' }}>{bug.environment}</span>
        )}
        <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginLeft: 'auto' }}>Updated {fmt(bug.updated_at)}</span>
      </div>

      {bug.gitlab_issue_url && (
        <div style={{ marginBottom: '1.5rem' }}>
          <a href={bug.gitlab_issue_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            GitLab Issue #{bug.gitlab_issue_url.match(/\/(\d+)$/)?.[1]}
          </a>
        </div>
      )}

      {bug.description && (
        <Section title="Description">
          <p style={{ margin: 0, color: '#374151', fontSize: '0.9rem', lineHeight: 1.6 }}>{bug.description}</p>
        </Section>
      )}

      {bug.steps?.length > 0 && (
        <Section title="Steps to Reproduce">
          <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#374151', fontSize: '0.9rem', lineHeight: 1.8 }}>
            {bug.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </Section>
      )}

      {(bug.expected || bug.actual) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.5rem' }}>
          {bug.expected && (
            <Section title="Expected">
              <p style={{ margin: 0, color: '#374151', fontSize: '0.9rem', lineHeight: 1.6 }}>{bug.expected}</p>
            </Section>
          )}
          {bug.actual && (
            <Section title="Actual">
              <p style={{ margin: 0, color: '#374151', fontSize: '0.9rem', lineHeight: 1.6 }}>{bug.actual}</p>
            </Section>
          )}
        </div>
      )}

      {/* Status change */}
      {allowed.length > 0 && (
        <Section title="Change Status">
          <form onSubmit={handleStatusChange} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={nextStatus} onChange={e => setNextStatus(e.target.value)} style={selectStyle}>
                <option value="">Select new status…</option>
                {allowed.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="submit" disabled={!nextStatus || statusSaving} style={primaryBtn}>
                {statusSaving ? 'Saving…' : 'Update'}
              </button>
            </div>
            <input
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder="Add a note (optional)"
              style={{ ...selectStyle, maxWidth: 400 }}
            />
            {statusError && <p style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>{statusError}</p>}
          </form>
        </Section>
      )}

      {/* Activity timeline */}
      <Section title="Activity">
        {bug.activity.length === 0 && (
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.875rem' }}>No activity yet.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bug.activity.map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1rem', marginTop: 1 }}>{entry.action === 'comment' ? '💬' : '🔄'}</span>
              <div style={{ flex: 1 }}>
                {entry.action === 'status_change' ? (
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                    Status changed from <strong>{entry.old_value}</strong> to <strong>{entry.new_value}</strong>
                    {entry.message && <span style={{ color: '#6b7280' }}> — {entry.message}</span>}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{entry.message}</span>
                )}
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{fmtTime(entry.created_at)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Add comment */}
        <form onSubmit={handleAddComment} style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            style={{ ...selectStyle, flex: 1, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <button type="submit" disabled={commentSaving} style={primaryBtn}>{commentSaving ? '…' : 'Post'}</button>
        </form>
        {commentError && <p style={{ margin: '4px 0 0', color: '#ef4444', fontSize: '0.85rem' }}>{commentError}</p>}
      </Section>

      {editOpen && (
        <BugModal
          initial={bug}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
        {children}
      </div>
    </div>
  );
}

function fmt(str) {
  if (!str) return '—';
  return new Date(str + (str.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(str) {
  if (!str) return '';
  return new Date(str + (str.endsWith('Z') ? '' : 'Z')).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const backBtn    = { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.875rem', padding: '0 0 16px', display: 'block' };
const ghostBtn   = { background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: '0.875rem' };
const dangerBtn  = { background: 'none', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: '0.875rem' };
const primaryBtn = { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: '0.875rem' };
const selectStyle = { border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' };
