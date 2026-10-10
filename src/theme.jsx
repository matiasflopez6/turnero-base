import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

// El tema inicial lo aplica el script inline de index.html (evita el parpadeo al cargar).
const STORAGE_KEY = 'turnero-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || readStored() || (media.matches ? 'dark' : 'light')
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sin preferencia guardada, seguimos el tema del sistema.
  useEffect(() => {
    const onChange = (ev) => {
      if (!readStored()) setTheme(ev.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Mantiene sincronizados otros componentes y pestañas.
  useEffect(() => {
    const onSync = () => setTheme(document.documentElement.dataset.theme || 'light');
    window.addEventListener('turnero-theme', onSync);
    window.addEventListener('storage', onSync);
    return () => {
      window.removeEventListener('turnero-theme', onSync);
      window.removeEventListener('storage', onSync);
    };
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento: el cambio vale solo para esta sesión.
    }
    applyTheme(next);
    setTheme(next);
    window.dispatchEvent(new Event('turnero-theme'));
  }

  return { theme, toggle };
}

export function ThemeToggle({ floating = false }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Usar tema claro' : 'Usar tema oscuro';
  return (
    <button
      className={`icon-btn ${floating ? 'theme-fab' : ''}`}
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
