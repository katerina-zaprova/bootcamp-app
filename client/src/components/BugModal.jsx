import { useState } from 'react';

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];

export default function BugModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    severity: initial?.severity ?? 'Major',
    steps: initial?.steps?.length ? [...initial.steps] : [''],
    expected: initial?.expected ?? '',
    actual: initial?.actual ?? '',
    environment: initial?.environment ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) { setForm(f => ({ ...f, [key]: value })); }

  function setStep(i, val) {
    setForm(f => { const s = [...f.steps]; s[i] = val; return { ...f, steps: s }; });
  }
  function addStep() { setForm(f => ({ ...f, steps: [...f.steps, ''] })); }
  function removeStep(i) { setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        severity: form.severity,
        steps: form.steps.filter(s => s.trim()),
        expected: form.expected.trim() || null,
        actual: form.actual.trim() || null,
        environment: form.environment.trim() || null,
      };
      const res = await fetch(
        initial ? `/api/bugs/${initial.id}` : '/api/bugs',
        { method: initial ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      const json = await res.json();
      if (json.success) { onSaved(json.data); } else { setError(json.error ?? 'Something went wrong.'); }
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
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{initial ? 'Edit Bug' : 'New Bug'}</h2>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Title *" fieldId="bug-title">
            <input id="bug-title" value={form.title} onChange={e => set('title', e.target.value)} maxLength={255} style={input} />
          </Field>

          <Field label="Description" fieldId="bug-description">
            <textarea id="bug-description" value={form.description} onChange={e => set('description', e.target.value)} style={{ ...input, minHeight: 64, resize: 'vertical' }} />
          </Field>

          <Field label="Severity *" fieldId="bug-severity">
            <select id="bug-severity" value={form.severity} onChange={e => set('severity', e.target.value)} style={input}>
              {SEVERITIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Steps to Reproduce" fieldId="bug-step-0">
            {form.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: '#9ca3af', fontSize: '0.8rem', minWidth: 16 }}>{i + 1}.</span>
                <input id={i === 0 ? 'bug-step-0' : undefined} value={step} onChange={e => setStep(i, e.target.value)} style={{ ...input, flex: 1 }} />
                {form.steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(i)} style={removeBtn}>×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addStep} style={addStepBtn}>+ Add step</button>
          </Field>

          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="Expected" fieldId="bug-expected" style={{ flex: 1 }}>
              <textarea id="bug-expected" value={form.expected} onChange={e => set('expected', e.target.value)} style={{ ...input, minHeight: 60, resize: 'vertical' }} />
            </Field>
            <Field label="Actual" fieldId="bug-actual" style={{ flex: 1 }}>
              <textarea id="bug-actual" value={form.actual} onChange={e => set('actual', e.target.value)} style={{ ...input, minHeight: 60, resize: 'vertical' }} />
            </Field>
          </div>

          <Field label="Environment" fieldId="bug-environment">
            <input id="bug-environment" value={form.environment} onChange={e => set('environment', e.target.value)} placeholder="e.g. Chrome 124 / macOS 14.4" style={input} />
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

function Field({ label, fieldId, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label htmlFor={fieldId} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const overlay   = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 };
const dialog    = { background: '#fff', borderRadius: 12, padding: 24, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const input     = { width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' };
const closeBtn  = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#9ca3af', lineHeight: 1, padding: 0 };
const addStepBtn = { background: 'none', border: '1px dashed #d1d5db', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', color: '#9ca3af', fontSize: '0.8rem' };
const removeBtn  = { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', lineHeight: 1 };
const cancelBtn  = { background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: '0.875rem' };
const submitBtn  = { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: '0.875rem' };
