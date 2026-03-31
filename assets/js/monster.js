/**
 * monster.js
 * Gerencia o estado do inimigo atual (monstro ou boss).
 * Persiste HP, dano e experiência no sessionStorage para sobreviver a refreshes.
 * O estado é restaurado se o nome do inimigo coincidir com o salvo.
 */
const Monster = (() => {
  const STORAGE_KEY = 'monster-state';

  let currentHp  = 0;
  let maxHp      = 0;
  let damage     = 2;
  let experience = 0;
  let coins      = 0;
  let name       = '';

  function save() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ currentHp, maxHp, damage, experience, coins, name }));
  }

  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)); }
    catch { return null; }
  }

  function init(record) {
    const saved = load();
    // Restaura estado salvo se for da mesma sala (mesmo nome/título)
    if (saved && saved.name === (record.title || '')) {
      currentHp  = saved.currentHp;
      maxHp      = saved.maxHp;
      damage     = saved.damage;
      experience = saved.experience;
      coins      = saved.coins ?? 0;
      name       = saved.name;
    } else {
      name       = record.title || '';
      const minHp = record['min-hp'] ?? (record.type === 'boss' ? 8 : 3);
      const maxHpVal = record['max-hp'] ?? (record.type === 'boss' ? 8 : 6);
      maxHp      = Math.floor(Math.random() * (maxHpVal - minHp + 1)) + minHp;
      currentHp  = maxHp;
      damage     = record.damage ?? 1;
      experience = record['exp-reward']  ?? 1;
      coins      = record['coin-reward'] ?? 0;
      save();
    }
    updateUI();
  }

  function applyDamage(amount) {
    currentHp = Math.max(0, currentHp - amount);
    save();
    updateUI();
  }

  function clearSave() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function updateUI() {
    const isBoss   = document.querySelector('.action-section[data-type="boss"]:not(.d-none)');
    const prefix   = isBoss ? 'boss' : 'monster';
    const hpText   = document.getElementById(`${prefix}-hp-text`);
    const hpVisual = document.getElementById(`${prefix}-hp-visual`);
    const dmgText  = document.getElementById(`${prefix}-damage-text`);
    if (!hpText || !hpVisual) return;

    hpText.textContent = `${currentHp} / ${maxHp} ❤️`;

    let visual = '';
    for (let i = 0; i < maxHp; i++) {
      visual += i < currentHp ? '🔴' : '⚫';
    }
    hpVisual.textContent = visual;

    if (dmgText) dmgText.textContent = damage;
  }

  // Restaura botões de combate se o monstro já estava derrotado
  function restoreCombatUI() {
    const saved = load();
    if (saved && saved.currentHp === 0) {
      document.querySelectorAll('#btn-accept, #btn-skip, #btn-use-ability').forEach(b => b.classList.add('d-none'));
      const activeSection = document.querySelector(
        '.card-option-section[data-type="monster"]:not(.d-none), .card-option-section[data-type="boss"]:not(.d-none)'
      );
      if (activeSection) {
        const btnContinue = activeSection.querySelector('#btn-continue');
        if (btnContinue) btnContinue.classList.remove('d-none');
      }
    }
  }

  return {
    init, applyDamage, clearSave, restoreCombatUI,
    get currentHp()  { return currentHp;  },
    get damage()     { return damage; },
    get experience() { return experience; },
    get coins()      { return coins;      },
  };
})();
