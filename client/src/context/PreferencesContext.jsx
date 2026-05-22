import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const DEFAULT_PREFS = {
  theme: 'system',
  default_severity_for_new_bugs: 'Minor',
  default_page_size: 20,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  auto_generate_report_after_run: true,
};

const PreferencesContext = createContext({
  prefs: DEFAULT_PREFS,
  resolvedTheme: 'light',
  reload: () => {},
});

export function usePreferences() {
  return useContext(PreferencesContext);
}

function resolveTheme(theme) {
  if (theme === 'dark')  return 'dark';
  if (theme === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme('system'));

  const applyTheme = useCallback((theme) => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success) {
        setPrefs(json.data);
        applyTheme(json.data.theme);
      }
    } catch { /* server not up yet — defaults hold */ }
  }, [applyTheme]);

  useEffect(() => { reload(); }, [reload]);

  // Track OS preference changes when theme = 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (prefs.theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [prefs.theme, applyTheme]);

  return (
    <PreferencesContext.Provider value={{ prefs, resolvedTheme, reload }}>
      {children}
    </PreferencesContext.Provider>
  );
}
