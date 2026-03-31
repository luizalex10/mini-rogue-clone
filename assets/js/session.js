/**
 * session.js
 * Controla a sessão de jogo ativa.
 * Armazena no localStorage se há uma partida em andamento e qual herói foi selecionado.
 */
const Session = (() => {
  const SESSION_KEY = 'game-session';
  const HERO_KEY    = 'selected-hero';
  const MODE_KEY    = 'game-mode';

  function start(hero, mode = 'normal') {
    localStorage.setItem(SESSION_KEY, 'active');
    localStorage.setItem(HERO_KEY, JSON.stringify(hero));
    localStorage.setItem(MODE_KEY, mode);
  }

  function end() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(HERO_KEY);
    localStorage.removeItem(MODE_KEY);
  }

  function isActive() {
    return localStorage.getItem(SESSION_KEY) === 'active' &&
           localStorage.getItem(HERO_KEY) !== null;
  }

  function getHero() {
    try { return JSON.parse(localStorage.getItem(HERO_KEY)); }
    catch { return null; }
  }

  function getMode() {
    return localStorage.getItem(MODE_KEY) || 'normal';
  }

  return { start, end, isActive, getHero, getMode };
})();
