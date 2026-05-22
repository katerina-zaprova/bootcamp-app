import { useState, useEffect } from 'react';
import { usePreferences } from '../context/PreferencesContext';

const TZ_LIST = (() => {
  try { return Intl.supportedValuesOf('timeZone'); } catch { /* fallback below */ }
  return [
    'UTC',
    'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'America/Toronto','America/Vancouver','America/Sao_Paulo','America/Mexico_City',
    'Europe/London','Europe/Dublin','Europe/Paris','Europe/Berlin','Europe/Madrid',
    'Europe/Rome','Europe/Amsterdam','Europe/Stockholm','Europe/Helsinki',
    'Europe/Warsaw','Europe/Kyiv','Europe/Moscow','Europe/Istanbul',
    'Asia/Dubai','Asia/Kolkata','Asia/Dhaka','Asia/Bangkok','Asia/Singapore',
    'Asia/Shanghai','Asia/Tokyo','Asia/Seoul',
    'Australia/Sydney','Australia/Melbourne','Australia/Perth',
    'Pacific/Auckland','Pacific/Honolulu',
  ];
})();

export default function Settings() {
  const { prefs, reload } = usePreferences();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState(null);

  useEffect(() => { setForm({ ...prefs }); }, [prefs]);

  function set(key, value) { setForm(f => ({ ...f, [key]: value })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Save failed');
      await reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div style={{ padding: '2rem', color: '#9ca3af' }}>Loading…</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 2rem', fontSize: '1.4rem', fontWeight: 700, color: '#111827' }}>Settings</h1>

      <form onSubmit={handleSave}>

        <Section title="Appearance">
          <Row label="Theme">
            <Segmented
              value={form.theme}
              onChange={v => set('theme', v)}
              options={[
                { value: 'light',  label: '☀ Light'  },
                { value: 'dark',   label: '☽ Dark'   },
                { value: 'system', label: '⬡ System' },
              ]}
            />
          </Row>
        </Section>

        <Section title="Defaults">
          <Row label="Default severity for new bugs">
            <select value={form.default_severity_for_new_bugs} onChange={e => set('default_severity_for_new_bugs', e.target.value)} style={sel}>
              {['Critical','Major','Minor','Trivial'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Row>
          <Row label="Default page size" last>
            <select value={form.default_page_size} onChange={e => set('default_page_size', Number(e.target.value))} style={sel}>
              {[10,20,50,100].map(n => <option key={n} value={n}>{n} rows per page</option>)}
            </select>
          </Row>
        </Section>

        <Section title="Localisation">
          <Row label="Timezone" last>
            <select value={form.timezone} onChange={e => set('timezone', e.target.value)} style={{ ...sel, maxWidth: 260 }}>
              {TZ_LIST.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Row>
        </Section>

        <Section title="Automation">
          <Row label="Auto-generate report after run completes" last>
            <Toggle checked={form.auto_generate_report_after_run} onChange={v => set('auto_generate_report_after_run', v)} />
          </Row>
        </Section>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" disabled={saving} style={saveBtn}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Settings saved</span>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: last ? 'none' : '1px solid #f3f4f6',
    }}>
      <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            padding: '5px 14px', cursor: 'pointer', fontSize: 13, border: 'none',
            borderRight: i < options.length - 1 ? '1px solid #e5e7eb' : 'none',
            background: value === opt.value ? '#6366f1' : '#fff',
            color:      value === opt.value ? '#fff'    : '#374151',
            fontWeight: value === opt.value ? 600       : 400,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="switch"
      style={{
        position: 'relative', width: 42, height: 24, borderRadius: 12, flexShrink: 0,
        background: checked ? '#6366f1' : '#d1d5db', border: 'none', cursor: 'pointer',
        transition: 'background .2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </button>
  );
}

const sel     = { border: '1px solid #e5e7eb', borderRadius: 6, padding: '5px 10px', fontSize: 13, background: '#fff', color: '#374151', fontFamily: 'inherit' };
const saveBtn = { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
