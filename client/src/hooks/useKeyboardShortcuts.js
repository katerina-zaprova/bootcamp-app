import { useEffect, useRef } from 'react';

function isEditableFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

// handlers: Array<{ id, test: (e, chord) => bool, action: () => void }>
// chord = 'g+b' style string built from last key + current key
export function useKeyboardShortcuts(handlers) {
  const lastKeyRef  = useRef(null);
  const lastTimeRef = useRef(0);
  // Keep handlers current without re-registering the listener
  const handlersRef = useRef(handlers);
  useEffect(() => { handlersRef.current = handlers; });

  useEffect(() => {
    function onKeyDown(e) {
      if (isEditableFocused()) return;

      const now   = Date.now();
      const chord = (lastKeyRef.current && now - lastTimeRef.current < 1500)
        ? lastKeyRef.current + '+' + e.key.toLowerCase()
        : null;

      for (const { test, action } of handlersRef.current) {
        if (test(e, chord)) {
          e.preventDefault();
          action();
          lastKeyRef.current  = null;
          lastTimeRef.current = 0;
          return;
        }
      }

      // Record this key for potential chord next keypress
      lastKeyRef.current  = e.key.toLowerCase();
      lastTimeRef.current = now;
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []); // register once; handlersRef keeps it fresh
}
