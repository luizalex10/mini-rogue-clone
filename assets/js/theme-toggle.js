const ThemeToggle = (() => {
  const STORAGE_KEY = 'bs-theme';
  const themes = ['auto', 'light', 'dark'];
  const icons  = { auto: '🌗', light: '☀️', dark: '🌙' };
  const labels = { auto: 'Auto', light: 'Claro', dark: 'Escuro' };

  let current = localStorage.getItem(STORAGE_KEY) || 'dark';

  function resolve(theme) {
    return theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', resolve(theme));
  }

  // Aplica imediatamente, antes do DOM pintar — evita flash
  applyTheme(current);

  function updateButton(btn, theme) {
    btn.textContent = `${icons[theme]} ${labels[theme]}`;
    btn.setAttribute('aria-label', `Tema atual: ${labels[theme]}`);
  }

  function initButton() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    updateButton(btn, current);

    btn.addEventListener('click', () => {
      const idx = themes.indexOf(current);
      current = themes[(idx + 1) % themes.length];
      localStorage.setItem(STORAGE_KEY, current);
      applyTheme(current);
      updateButton(btn, current);
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (current === 'auto') applyTheme('auto');
  });

  return { initButton };
})();
