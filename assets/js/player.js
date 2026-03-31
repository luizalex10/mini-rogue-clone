/**
 * player.js
 * Gerencia o estado completo do jogador.
 * Persiste todos os atributos no localStorage para sobreviver a refreshes e recargas.
 * completeRoom() avança o progresso e limpa o estado temporário da sala (sessionStorage).
 */
const Player = (() => {
  const STORAGE_KEY = 'player-data';

  const defaults = { currentHp: 10, maxHp: 10, experience: 0, coins: 0, rerolls: 1, weaponUpgraded: false, rooms: 0, deck: [], abilityUses: 1, bonusHp: 0, shield: 0 };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved ? { ...defaults, ...saved } : { ...defaults };
    } catch { return { ...defaults }; }
  }

  let state = load();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('monster-state');
    sessionStorage.removeItem('battle-log-state');
    sessionStorage.removeItem('room-completed');
    sessionStorage.removeItem('room-state');
    sessionStorage.removeItem('pending-game-mode');
    Session.end();
    window.location.href = 'index.html';
  }

  function initFromHero(hero) {
    const hp     = hero['initial-hp']     ?? 10;
    const shield = hero['initial-shield'] ?? 0;
    state = { ...defaults, currentHp: hp, maxHp: hp, shield };
    save();
  }

  function updateUI() {
    const hpText    = document.getElementById('player-hp-text');
    const hpVisual  = document.getElementById('player-hp-visual');
    const expEl     = document.getElementById('player-exp');
    const coinsEl   = document.getElementById('player-coins');
    const rerollsEl = document.getElementById('player-rerolls');
    if (!hpText) return;

    hpText.textContent = `${state.currentHp} / ${state.maxHp}`;

    let visual = '';
    for (let i = 0; i < state.maxHp; i++) {
      visual += i < state.currentHp ? '🔴' : '⚫';
    }
    hpVisual.textContent = visual;

    if (expEl)     expEl.textContent     = state.experience;
    if (coinsEl)   coinsEl.textContent   = state.coins;
    if (rerollsEl) rerollsEl.textContent = state.rerolls;

    const shieldEl = document.getElementById('player-shield');
    if (shieldEl) shieldEl.textContent = state.shield > 0 ? '🛡️'.repeat(state.shield) : '';
  }

  function initUI()              { updateUI(); updateRoomsUI(); updateAbilityUI(); }
  function addExperience(amount) {
    state.experience += amount;
    // Bônus de HP ao atingir 5 XP (máximo uma vez por partida)
    if (state.bonusHp === 0 && state.experience >= 5) {
      state.bonusHp  = 2;
      state.maxHp   += 2;
      state.currentHp = Math.min(state.currentHp + 2, state.maxHp);
    }
    save(); updateUI();
  }
  function addCoins(amount)      { state.coins      += amount; save(); updateUI(); }
  function applyDamage(amount)   {
    // Escudo absorve dano primeiro, perdido permanentemente
    if (state.shield > 0) {
      const absorbed = Math.min(state.shield, amount);
      state.shield  -= absorbed;
      amount        -= absorbed;
    }
    state.currentHp = Math.max(0, state.currentHp - amount);
    save(); updateUI();
  }
  function addShield(amount)     { state.shield += amount; save(); updateUI(); }
  function heal(amount)          { state.currentHp = Math.min(state.maxHp, state.currentHp + amount); save(); updateUI(); }
  function useReroll()           {
    if (state.rerolls > 0) { state.rerolls--; save(); updateUI(); return true; }
    return false;
  }
  function addRerolls(amount)    { state.rerolls += amount; save(); updateUI(); }
  function spendCoins(amount)    { state.coins = Math.max(0, state.coins - amount); save(); updateUI(); }
  function upgradeWeapon()       {
    if (!state.weaponUpgraded) {
      state.weaponUpgraded = true;
      // Incrementa bonus-atk no herói da sessão
      const hero = Session.getHero();
      if (hero) {
        hero['bonus-atk'] = (hero['bonus-atk'] ?? 0) + 1;
        localStorage.setItem('selected-hero', JSON.stringify(hero));
      }
      save();
    }
  }
  function useAbility()          { if (state.abilityUses > 0) { state.abilityUses--; save(); updateAbilityUI(); return true; } return false; }
  function restoreAbility(amount = 1) { state.abilityUses += amount; save(); updateAbilityUI(); }

  function updateAbilityUI() {
    const el = document.getElementById('btn-use-ability');
    if (!el) return;
    el.textContent = `Usar habilidade (${state.abilityUses})`;
    el.disabled = state.abilityUses === 0;
  }
  function addRoom()             { state.rooms++; save(); updateRoomsUI(); }
  function setDeck(deck)         { state.deck = deck; save(); }
  function getDeck()             { return state.deck; }
  function debugRefill()         {
    state.currentHp = state.maxHp;
    state.rerolls   = 5;
    state.coins     = 10;
    save(); updateUI();
  }
  function completeRoom()        {
    sessionStorage.setItem('room-completed', '1');
    sessionStorage.removeItem('monster-state');
    sessionStorage.removeItem('battle-log-state');
    sessionStorage.removeItem('room-state');
    location.reload();
  }

  function updateRoomsUI() {
    const el = document.getElementById('rooms-explored');
    if (el) el.textContent = `${state.rooms} sala${state.rooms !== 1 ? 's' : ''} explorada${state.rooms !== 1 ? 's' : ''}`;
  }

  return {
    initUI, addExperience, addCoins, applyDamage, heal, useReroll, addRerolls, spendCoins, upgradeWeapon, useAbility, restoreAbility, addRoom, setDeck, getDeck, debugRefill, completeRoom, reset,
    get currentHp()       { return state.currentHp;       },
    get maxHp()           { return state.maxHp;           },
    get experience()      { return state.experience;      },
    get coins()           { return state.coins;           },
    get rerolls()         { return state.rerolls;         },
    get weaponUpgraded()  { return state.weaponUpgraded;  },
    get rooms()           { return state.rooms;           },
    get deck()            { return state.deck;            },
    get abilityUses()     { return state.abilityUses;     },
    get bonusHp()         { return state.bonusHp;         },
    get shield()          { return state.shield;          },
    addShield,
    initFromHero,
  };
})();
