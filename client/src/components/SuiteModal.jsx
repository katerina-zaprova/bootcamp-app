import { useState } from 'react';

const STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed'];

export default function SuiteModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    feature: initial?.feature ?? '',
    status: initial?.status ?? 'draft',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.feature.trim()) {
      setError('Name and feature are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        initial ? `/api/test-suites/${initial.id}` : '/api/test-suites',
        { method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) },
      );
      const json = await res.json();
      if (json.success) { onSaved(json.data.id ?? initial?.id); }
      else { setError(json.error ?? 'Something went wrong.'); }
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={dialog}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{initial ? 'Edit Suite' : 'New Suite'}</h2>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <Field label="Name *" fieldId="suite-name">
            <input id="suite-name" value={form.name} onChange={e => set('name', e.target.value)} style={input} />
          </Field>
          <Field label="Feature *" fieldId="suite-feature">
            <input id="suite-feature" value={form.feature} onChange={e => set('feature', e.target.value)} placeholder="e.g. login, registration" style={input} />
          </Field>
          <Field label="Status" fieldId="suite-status">
            <select id="suite-status" value={form.status} onChange={e => set('status', e.target.value)} style={input}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '4px 0 8px' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={submitBtn}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, fieldId, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={fieldId} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 };
const dialog   = { background: '#fff', borderRadius: 12, padding: 24, width: 440, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const input    = { width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' };
const closeBtn  = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#9ca3af', lineHeight: 1, padding: 0 };
const cancelBtn = { background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: '0.875rem' };
const submitBtn = { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: '0.875rem' };
