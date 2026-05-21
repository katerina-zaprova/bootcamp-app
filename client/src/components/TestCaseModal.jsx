import { useState } from 'react';

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped'];

export default function TestCaseModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    preconditions: initial?.preconditions ?? '',
    steps: initial?.steps?.length ? [...initial.steps] : [''],
    expected_result: initial?.expected_result ?? '',
    severity: initial?.severity ?? 'Major',
    status: initial?.status ?? 'draft',
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
    const steps = form.steps.filter(s => s.trim());
    if (!form.title.trim() || !steps.length || !form.expected_result.trim()) {
      setError('Title, at least one step, and expected result are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        initial ? `/api/test-cases/${initial.id}` : '/api/test-cases',
        {
          method: initial ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, steps, preconditions: form.preconditions.trim() || null }),
        },
      );
      const json = await res.json();
      if (json.success) { onSaved(); } else { setError(json.error ?? 'Something went wrong.'); }
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
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{initial ? 'Edit Test Case' : 'New Test Case'}</h2>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Title *" fieldId="tc-title">
            <input id="tc-title" value={form.title} onChange={e => set('title', e.target.value)} style={input} />
          </Field>

          <Field label="Preconditions" fieldId="tc-preconditions">
            <textarea id="tc-preconditions" value={form.preconditions} onChange={e => set('preconditions', e.target.value)} style={{ ...input, minHeight: 56, resize: 'vertical' }} />
          </Field>

          <Field label="Steps *" fieldId="tc-step-0">
            {form.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: '#9ca3af', fontSize: '0.8rem', minWidth: 16 }}>{i + 1}.</span>
                <input id={i === 0 ? 'tc-step-0' : undefined} value={step} onChange={e => setStep(i, e.target.value)} style={{ ...input, flex: 1 }} />
                {form.steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', lineHeight: 1 }}>×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addStep} style={addStepBtn}>+ Add step</button>
          </Field>

          <Field label="Expected Result *" fieldId="tc-expected">
            <textarea id="tc-expected" value={form.expected_result} onChange={e => set('expected_result', e.target.value)} style={{ ...input, minHeight: 72, resize: 'vertical' }} />
          </Field>

          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="Severity *" fieldId="tc-severity" style={{ flex: 1 }}>
              <select id="tc-severity" value={form.severity} onChange={e => set('severity', e.target.value)} style={input}>
                {SEVERITIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Status *" fieldId="tc-status" style={{ flex: 1 }}>
              <select id="tc-status" value={form.status} onChange={e => set('status', e.target.value)} style={input}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

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

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 };
const dialog  = { background: '#fff', borderRadius: 12, padding: 24, width: 540, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const input   = { width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' };
const closeBtn   = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#9ca3af', lineHeight: 1, padding: 0 };
const addStepBtn = { background: 'none', border: '1px dashed #d1d5db', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', color: '#9ca3af', fontSize: '0.8rem' };
const cancelBtn  = { background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: '0.875rem' };
const submitBtn  = { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: '0.875rem' };
