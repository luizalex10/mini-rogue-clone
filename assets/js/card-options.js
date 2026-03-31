function initCardOptions() {

    let pendingPlayerDamage  = 0;
    let pendingMonsterDamage = 0;
    let pendingLog           = [];
    let turnCount            = 0;
    let abilityActiveThisTurn = false; // Mago: habilidade de dobrar dano ativa
    let barbarianBonusActive  = false; // Bárbaro: +3 de dano garantido ativo

    const LOG_KEY = 'battle-log-state';

    function saveLog() {
        sessionStorage.setItem(LOG_KEY, JSON.stringify({ turns: turnCount, entries: [] }));
    }

    function restoreLog() {
        try {
            const log = document.querySelector('.action-section:not(.d-none) .battle-log');
            if (!log) return;
            const saved = JSON.parse(sessionStorage.getItem(LOG_KEY) || 'null');
            if (saved && saved.html) {
                log.innerHTML = saved.html;
                turnCount = saved.turnCount || 0;
                log.scrollTop = log.scrollHeight;
            }
        } catch {}
    }

    function persistLog() {
        const log = document.querySelector('.action-section:not(.d-none) .battle-log');
        if (!log) return;
        sessionStorage.setItem(LOG_KEY, JSON.stringify({ html: log.innerHTML, turnCount }));
    }

    // Helper: herói atual
    function getHero() { return Session.getHero() || {}; }

    // Atualiza botão de habilidade
    function refreshAbilityButton() {
        const hero = getHero();
        const hasUses = Player.abilityUses > 0;
        // Verifica pré-condição específica por habilidade
        let canUse = hasUses;
        if (hasUses && hero.ability === 'tranform-exp-into-rerolls') {
            canUse = Player.experience > 0;
        }
        document.querySelectorAll('#btn-use-ability').forEach(btn => {
            btn.textContent = `Usar habilidade (${Player.abilityUses})`;
            btn.disabled = !canUse;
            btn.classList.toggle('d-none', !hasUses);
        });
    }

    // Exibe a section de opções correspondente ao type sorteado
    document.addEventListener('card:typeReady', (e) => {
        const type = e.detail.type;
        document.querySelectorAll('.card-option-section').forEach(s => s.classList.add('d-none'));
        const section = document.querySelector(`.card-option-section[data-type="${type}"]`);
        if (section) {
            section.classList.remove('d-none');
            section.style.opacity = '0';
            section.style.transition = 'opacity 0.5s ease';
            section.getBoundingClientRect();
            section.style.opacity = '1';
        }
        if (type === 'monster' || type === 'boss') {
            refreshAbilityButton();
            // Restaura log e estado de combate após refresh
            setTimeout(() => {
                restoreLog();
                Monster.restoreCombatUI();
            }, 100);
        }

        // Restaura modal de resultado para rooms não-monster após refresh
        const saved = (() => { try { return JSON.parse(sessionStorage.getItem('room-state')); } catch { return null; } })();
        if (saved && saved.type === type) {
            setTimeout(() => {
                if (type === 'trap') {
                    document.getElementById('trap-roll').textContent = saved.roll;
                    document.getElementById('trap-result-text').textContent = saved.text;
                    showTrapModal();
                } else if (type === 'treasure') {
                    document.getElementById('treasure-roll').textContent = saved.roll;
                    document.getElementById('treasure-result-text').textContent = saved.text;
                    showTreasureModal(saved.coins);
                } else if (type === 'weapon') {
                    document.getElementById('weapon-roll').textContent = saved.roll;
                    document.getElementById('weapon-result-text').textContent = saved.text;
                    showWeaponModal(saved.rerolls, saved.xp);
                } else if (type === 'shrine') {
                    document.getElementById('shrine-roll').textContent = saved.roll;
                    document.getElementById('shrine-result-text').textContent = saved.text;
                    showShrineModal(saved.heal, saved.rerolls, saved.shield, saved.halfHeal);
                }
            }, 1200);
        }
    });

    // Food: habilita/desabilita botões conforme moedas
    document.addEventListener('card:typeReady', (e) => {
        if (e.detail.type !== 'food') return;
        const healBtn   = document.getElementById('btn-food-heal');
        const weaponBtn = document.getElementById('btn-food-weapon');
        const rerollBtn = document.getElementById('btn-food-reroll');
        if (healBtn)   healBtn.disabled   = Player.coins < 2;
        if (weaponBtn) weaponBtn.disabled = Player.coins < 5 || Player.weaponUpgraded;
        if (rerollBtn) rerollBtn.disabled = Player.coins < 3;
    });

    // --- Fuga ---
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-skip') tryEscape();
    });

    function tryEscape() {
        const roll = Math.floor(Math.random() * 6) + 1;
        const escaped = roll >= 5;
        document.getElementById('escape-result-text').textContent =
            escaped ? `(${roll}) ...conseguiu escapar!` : `(${roll}) ...mas não conseguiu escapar.`;

        const btnConfirm = document.getElementById('btn-escape-confirm');
        const fresh = btnConfirm.cloneNode(true);
        btnConfirm.replaceWith(fresh);

        if (escaped) {
            fresh.addEventListener('click', () => Player.completeRoom());
        } else {
            fresh.addEventListener('click', () => {
                bootstrap.Modal.getInstance(document.getElementById('modalEscape')).hide();
                const btnSkipEl = document.querySelector('.card-option-section[data-type="monster"] #btn-skip');
                if (btnSkipEl) {
                    btnSkipEl.classList.add('d-none');
                    btnSkipEl.replaceWith(btnSkipEl.cloneNode(true));
                }
            });
        }
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEscape')).show();
    }

    // Trap: popula custo de evitar e habilita/desabilita botão
    document.addEventListener('card:typeReady', (e) => {
        if (e.detail.type !== 'trap') return;
        const deck  = Player.getDeck();
        const index = Player.rooms;
        const card  = deck && deck[index] ? deck[index] : {};
        const cost  = card['exp-to-pay'] ?? 0;

        document.querySelectorAll('#trap-avoid-cost').forEach(el => el.textContent = cost);
        const btnAvoid = document.getElementById('btn-trap-avoid');
        if (btnAvoid) btnAvoid.disabled = cost === 0 || Player.experience < cost;
    });

    // Tentar desviar
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-trap') openTrap();
    });

    // Evitar armadilha pagando XP
    document.addEventListener('click', (e) => {
        if (e.target.id !== 'btn-trap-avoid') return;
        const deck  = Player.getDeck();
        const index = Player.rooms;
        const card  = deck && deck[index] ? deck[index] : {};
        const cost  = card['exp-to-pay'] ?? 0;

        document.getElementById('trap-avoid-cost-confirm').textContent = cost;

        const btnConfirm = document.getElementById('btn-trap-avoid-confirm');
        const fresh = btnConfirm.cloneNode(true);
        btnConfirm.replaceWith(fresh);
        fresh.addEventListener('click', () => {
            bootstrap.Modal.getInstance(document.getElementById('modalTrapAvoid')).hide();
            Player.addExperience(-cost);
            Player.completeRoom();
        });

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalTrapAvoid')).show();
    });

    function openTrap() {
        const hero = getHero();
        const roll = Math.floor(Math.random() * 6) + 1;
        let text = '', damage = 0, xp = 0;

        if (roll === 1)    { text = '...e você falhou miseravelmente! 3 pontos de dano recebidos.'; damage = 3; }
        else if (roll < 5) { text = '...e você falhou! 2 pontos de dano recebidos.'; damage = 2; }
        else               { text = '...e você conseguiu escapar! Ganhou 1 ponto de experiência.'; xp = 1; }

        // Passive Aventureiro: ganha 1 moeda se tirar 6
        if (roll === 6 && hero.passive === 'gain-one-coin-on-dice-six') {
            Player.addCoins(1);
            text += ' (+1🪙 passiva)';
        }
        // Passive Mago: ganha re-rolagem se tirar 6
        if (roll === 6 && hero.passive === 'extra-re-roll-on-six') {
            Player.addRerolls(1);
            text += ' (+1 re-rolagem passiva)';
        }

        document.getElementById('trap-roll').textContent = roll;
        document.getElementById('trap-result-text').textContent = text;
        if (damage > 0) Player.applyDamage(damage);
        if (xp > 0)     Player.addExperience(xp);

        // Persiste estado para sobreviver a refresh
        sessionStorage.setItem('room-state', JSON.stringify({ type: 'trap', roll, text }));

        showTrapModal();
    }

    function showTrapModal() {
        const btnConfirm = document.getElementById('btn-trap-confirm');
        const fresh = btnConfirm.cloneNode(true);
        btnConfirm.replaceWith(fresh);
        fresh.addEventListener('click', () => {
            sessionStorage.removeItem('room-state');
            bootstrap.Modal.getInstance(document.getElementById('modalTrap')).hide();
            if (Player.currentHp === 0) {
                bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGameOver')).show();
            } else {
                Player.completeRoom();
            }
        });
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalTrap')).show();
    }

    // --- Shrine ---
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-shrine')      openShrine();
        if (e.target.id === 'btn-shrine-skip') Player.completeRoom();
    });

    function openShrine() {
        const roll = Math.floor(Math.random() * 6) + 1;
        let text = '', heal = 0, rerolls = 0, shield = 0, halfHeal = false;

        if (roll === 1) {
            text = '"Sua fé é fraca." Nada acontece.';
        } else if (roll <= 3) {
            text = '"Aceito sua fé..." +3 pontos de vida e +1 re-rolagem.';
            heal = 3; rerolls = 1;
        } else if (roll <= 5) {
            text = '"Sua fé é forte!" +3 pontos de vida e +2 pontos de escudo.';
            heal = 3; shield = 2;
        } else {
            text = 'Restaurou 50% da vida perdida e ganhou +3 pontos de escudo.';
            halfHeal = true; shield = 3;
        }

        document.getElementById('shrine-roll').textContent = roll;
        document.getElementById('shrine-result-text').textContent = text;

        sessionStorage.setItem('room-state', JSON.stringify({ type: 'shrine', roll, text, heal, rerolls, shield, halfHeal }));

        showShrineModal(heal, rerolls, shield, halfHeal);
    }

    function showShrineModal(heal, rerolls, shield, halfHeal) {
        const btnConfirm = document.getElementById('btn-shrine-confirm');
        const fresh = btnConfirm.cloneNode(true);
        btnConfirm.replaceWith(fresh);
        fresh.addEventListener('click', () => {
            sessionStorage.removeItem('room-state');
            bootstrap.Modal.getInstance(document.getElementById('modalShrine')).hide();
            if (halfHeal) {
                const lost = Player.maxHp - Player.currentHp;
                Player.heal(Math.floor(lost / 2));
            } else if (heal > 0) {
                Player.heal(heal);
            }
            if (rerolls > 0) Player.addRerolls(rerolls);
            if (shield > 0)  Player.addShield(shield);
            Player.completeRoom();
        });
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalShrine')).show();
    }

    // --- Tesouro ---
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-collect') openTreasure();
    });
    function openTreasure() {
        const hero = getHero();
        const roll = Math.floor(Math.random() * 6) + 1;
        let coins = 0, text = '';
        if (roll === 1)     { text = '...nada foi encontrado!'; coins = 0; }
        else if (roll <= 3) { text = '...e 1 moeda foi encontrada!'; coins = 1; }
        else if (roll <= 5) { text = '...e 2 moedas foram encontradas!'; coins = 2; }
        else                { text = '...e 3 moedas foram encontradas!'; coins = 3; }

        // Passive Aventureiro: +1 moeda se tirar 6
        if (roll === 6 && hero.passive === 'gain-one-coin-on-dice-six') {
            coins += 1;
            text += ' (+1🪙 passiva)';
        }

        document.getElementById('treasure-roll').textContent = roll;
        document.getElementById('treasure-result-text').textContent = text;

        sessionStorage.setItem('room-state', JSON.stringify({ type: 'treasure', roll, text, coins }));

        showTreasureModal(coins);
    }

    function showTreasureModal(coins) {
        const btnConfirm = document.getElementById('btn-treasure-confirm');
        const fresh = btnConfirm.cloneNode(true);
        btnConfirm.replaceWith(fresh);
        fresh.addEventListener('click', () => {
            sessionStorage.removeItem('room-state');
            if (coins > 0) Player.addCoins(coins);
            Player.completeRoom();
        });
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalTreasure')).show();
    }

    // --- Arma ---
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-weapon') openWeapon();
    });

    function openWeapon() {
        const roll = Math.floor(Math.random() * 6) + 1;
        let text = '', rerolls = 0, xp = 0;
        if (roll === 1)     { text = '...não serve para nada. Nada ganho.'; }
        else if (roll <= 3) { text = '...útil! +1 re-rolagem.'; rerolls = 1; }
        else if (roll <= 5) { text = '...muito boa! +2 re-rolagens.'; rerolls = 2; }
        else                { text = '...excepcional! +3 re-rolagens e +1 experiência.'; rerolls = 3; xp = 1; }

        document.getElementById('weapon-roll').textContent = roll;
        document.getElementById('weapon-result-text').textContent = text;

        sessionStorage.setItem('room-state', JSON.stringify({ type: 'weapon', roll, text, rerolls, xp }));

        showWeaponModal(rerolls, xp);
    }

    function showWeaponModal(rerolls, xp) {
        const btnConfirm = document.getElementById('btn-weapon-confirm');
        const fresh = btnConfirm.cloneNode(true);
        btnConfirm.replaceWith(fresh);
        fresh.addEventListener('click', () => {
            sessionStorage.removeItem('room-state');
            if (rerolls > 0) Player.addRerolls(rerolls);
            if (xp > 0)      Player.addExperience(xp);
            Player.completeRoom();
        });
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalWeapon')).show();
    }

    // --- Comida (loja) ---
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || !btn.closest('.card-option-section[data-type="food"]')) return;
        const action = btn.dataset.action;
        if (action === 'skip') { Player.completeRoom(); return; }

        const labels = {
            heal:   'comprar Comida por 2🪙 e restaurar 4 pontos de vida',
            weapon: 'melhorar sua arma por 5🪙 e ganhar +1 de dano permanente',
            reroll: 'comprar uma Re-Rolagem por 3🪙',
        };
        document.getElementById('food-confirm-text').textContent = `Você deseja ${labels[action]}?`;

        const btnYes = document.getElementById('btn-food-yes');
        const fresh  = btnYes.cloneNode(true);
        btnYes.replaceWith(fresh);
        fresh.addEventListener('click', () => {
            Player.spendCoins(parseInt(btn.dataset.cost));
            if (action === 'heal')   Player.heal(4);
            if (action === 'weapon') Player.upgradeWeapon();
            if (action === 'reroll') Player.addRerolls(1);
            Player.completeRoom();
        });
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalShopConfirm')).show();
    });

    // --- Habilidade ---
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-use-ability')) return;
        const hero = getHero();
        if (Player.abilityUses === 0) return;

        // Popula descrição no modal de confirmação
        document.getElementById('ability-confirm-description').textContent =
            hero['ability-description'] || '';

        // Verifica pré-condição e habilita/desabilita botão Usar
        const btnUse = document.getElementById('btn-ability-use');
        let canUse = true;
        let hint   = '';
        switch (hero.ability) {
            case 'tranform-exp-into-rerolls':
                canUse = Player.experience > 0;
                hint   = canUse ? '' : 'Você não possui pontos de experiência.';
                break;
            case 'extra-damage-always':
            case 'double-damage-done':
            case 'life-restore':
            default:
                canUse = true;
        }
        btnUse.disabled = !canUse;
        btnUse.title    = hint;

        // Clona botão Usar para evitar listeners duplicados
        const fresh = btnUse.cloneNode(true);
        btnUse.replaceWith(fresh);
        fresh.disabled = !canUse;
        fresh.title    = hint;

        fresh.addEventListener('click', () => {
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmAbility')).hide();
            executeAbility(hero);
        });

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalConfirmAbility')).show();
    });

    function executeAbility(hero) {
        switch (hero.ability) {
            case 'tranform-exp-into-rerolls': {
                const convert = Math.min(3, Player.experience);
                if (convert === 0) return;
                if (!Player.useAbility()) return;
                Player.addExperience(-convert);
                Player.addRerolls(convert);
                logEntry(`<span class="text-warning fw-semibold">Habilidade:</span> ${convert} XP convertido(s) em re-rolagem(s).`);
                break;
            }
            case 'extra-damage-always': {
                if (!Player.useAbility()) return;
                barbarianBonusActive = true;
                pendingMonsterDamage += 3;
                logEntry(`<span class="text-warning fw-semibold">Habilidade:</span> +3 de dano garantido ativado.`);
                break;
            }
            case 'double-damage-done': {
                if (!Player.useAbility()) return;
                abilityActiveThisTurn = true;
                logEntry(`<span class="text-warning fw-semibold">Habilidade:</span> Próximo ataque causará dano dobrado.`);
                break;
            }
            case 'life-restore': {
                if (!Player.useAbility()) return;
                const roll = Math.floor(Math.random() * 6) + 1;
                Player.heal(roll);
                logEntry(`<span class="text-warning fw-semibold">Habilidade:</span> Restaurou ${roll} ponto(s) de vida.`);
                break;
            }
            case 'ninja-star': {
                if (!Player.useAbility()) return;
                if (Monster.currentHp === 0) {
                    logEntry(`<span class="text-warning fw-semibold">Habilidade:</span> Inimigo já derrotado.`);
                    Player.restoreAbility(1);
                    refreshAbilityButton();
                    break;
                }
                const roll = Math.floor(Math.random() * 6) + 1;
                const dmg  = Math.ceil(roll / 2);
                pendingMonsterDamage = 0; // dano direto, não acumula com pendente
                Monster.applyDamage(dmg);
                logEntry(`<span class="text-warning fw-semibold">Habilidade:</span> Estrela ninja! Dado: ${roll} → ${dmg} ponto(s) de dano direto.`);
                flushLog();
                if (Monster.currentHp === 0) {
                    document.querySelectorAll('#btn-accept, #btn-skip, #btn-use-ability').forEach(b => b.classList.add('d-none'));
                    const activeSection = document.querySelector(
                        '.card-option-section[data-type="monster"]:not(.d-none), .card-option-section[data-type="boss"]:not(.d-none)'
                    );
                    if (activeSection) {
                        const btnContinue = activeSection.querySelector('#btn-continue');
                        if (btnContinue) btnContinue.classList.remove('d-none');
                    }
                }
                break;
            }
        }
        refreshAbilityButton();
    }

    // --- Continuar (vitória) ---
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-continue')) return;
        const isBoss = !!document.querySelector('.card-option-section[data-type="boss"]:not(.d-none)');
        const xp    = Monster.experience;
        const coins = Monster.coins;
        if (xp > 0)    Player.addExperience(xp);
        if (coins > 0) Player.addCoins(coins);

        if (isBoss) {
            sessionStorage.setItem('room-completed', '1');
            window.location.href = 'victory.html';
            return;
        }

        let rewardText = '';
        if (xp > 0 && coins > 0) rewardText = `${xp} ponto(s) de experiência e ${coins} moeda(s)`;
        else if (xp > 0)         rewardText = `${xp} ponto(s) de experiência`;
        else if (coins > 0)      rewardText = `${coins} moeda(s)`;
        else                     rewardText = 'Nenhuma recompensa';

        document.getElementById('battle-xp-reward').textContent = rewardText;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalVictory')).show();
    });

    // --- Combate ---
    function logEntry(text) { pendingLog.push(text); }

    function flushLog() {
        const activeSection = document.querySelector('.action-section[data-type="monster"]:not(.d-none), .action-section[data-type="boss"]:not(.d-none)');
        const log = activeSection ? activeSection.querySelector('.battle-log') : null;
        if (!log || pendingLog.length === 0) return;
        turnCount++;
        const entry = document.createElement('div');
        entry.classList.add('mb-2');
        entry.innerHTML = `<strong>Turno ${turnCount}</strong><br>` + pendingLog.join('<br>');
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        pendingLog = [];
        persistLog();
    }

    /**
     * Teste de habilidade do jogador (regra 3.1)
     * Passives aplicadas:
     * - bonus-by-three-rerolls (Artista Marcial): +1 ao resultado se rerolls >= 3
     * - extra-two-damage-on-three-reroll (Bárbaro): +2 de dano se rerolls >= 3 antes do cálculo
     * Ability aplicada:
     * - double-damage-done (Mago): dobra o dano se abilityActiveThisTurn
     * - extra-damage-always (Bárbaro): +3 já somado em pendingMonsterDamage antes do teste
     */
    function performSkillTest() {
        const hero = getHero();
        let roll = Math.floor(Math.random() * 6) + 1;

        // Passive Aventureiro: +1 moeda se tirar 6
        if (roll === 6 && hero.passive === 'gain-one-coin-on-dice-six') {
            Player.addCoins(1);
            logEntry(`<span class="text-warning fw-semibold">Passiva:</span> Resultado 6 — +1🪙.`);
        }

        // Passive Artista Marcial: +1 ao resultado se rerolls >= 3
        const hasSkillBonus = (hero.passive === 'bonus-by-three-rerolls' && Player.rerolls >= 3)
                           || (hero.passive === 'bonus-by-four-lifes'    && Player.currentHp <= 4);
        if (hasSkillBonus) roll = Math.min(6, roll + 1);

        const success = roll >= 4;
        document.getElementById('player-roll').textContent = roll + (hasSkillBonus ? ' (+1)' : '');
        document.getElementById('player-roll-result').textContent = success ? '(sucesso)' : '(falha)';
        const diceImg = document.getElementById('player-dice-img');

        // Passive Mago: +1 re-rolagem se tirar 6 (antes do bônus)
        const rawRoll = hasSkillBonus ? roll - 1 : roll;
        if (rawRoll === 6 && hero.passive === 'extra-re-roll-on-six') {
            Player.addRerolls(1);
            logEntry(`<span class="text-warning fw-semibold">Passiva:</span> Resultado 6 — +1 re-rolagem.`);
            document.getElementById('reroll-count').textContent = Player.rerolls;
        }

        if (success) {
            const minAtk  = hero['min-atk']   ?? 1;
            const maxAtk  = hero['max-atk']   ?? 6;
            const bonusAtk = hero['bonus-atk'] ?? 0;
            let dmg = Math.floor(Math.random() * (maxAtk - minAtk + 1)) + minAtk + bonusAtk;

            // Passive Bárbaro: +2 de dano se rerolls >= 3
            const hasDmgBonus = hero.passive === 'extra-two-damage-on-three-reroll' && Player.rerolls >= 3;
            if (hasDmgBonus) { dmg += 2; }

            // Ability Mago: dobra o dano
            if (abilityActiveThisTurn) {
                dmg *= 2;
                abilityActiveThisTurn = false;
            }

            // Ability Bárbaro: +3 já em pendingMonsterDamage, soma ao dano do teste
            pendingMonsterDamage += dmg;

            document.getElementById('player-attack-text').textContent =
                `O dano causado foi de ${pendingMonsterDamage}` +
                (hasDmgBonus ? ' (+2 passiva)' : '');
            diceImg.classList.remove('d-none');
            document.getElementById('btn-reroll').disabled = true;
            logEntry(`<span class="text-primary fw-semibold">O jogador</span> obtém ${roll}${hasSkillBonus ? ' (+1 passiva)' : ''}, acertando o ataque e causando ${pendingMonsterDamage} ponto(s) de dano.`);
        } else {
            // Falha — Mago: reembolsa habilidade se estava ativa
            if (abilityActiveThisTurn) {
                abilityActiveThisTurn = false;
                Player.restoreAbility(1);
                refreshAbilityButton();
                logEntry(`<span class="text-warning fw-semibold">Habilidade reembolsada</span> (falha no teste).`);
            }

            // Bárbaro extra-damage-always: aplica os 3 de dano mesmo na falha
            if (hero.ability === 'extra-damage-always' && pendingMonsterDamage > 0) {
                document.getElementById('player-attack-text').textContent =
                    `Errou o ataque, mas causou ${pendingMonsterDamage} de dano (habilidade).`;
                diceImg.classList.remove('d-none');
            } else {
                pendingMonsterDamage = 0;
                document.getElementById('player-attack-text').textContent = 'Você errou o ataque';
                diceImg.classList.add('d-none');
            }

            document.getElementById('btn-reroll').disabled = Player.rerolls === 0;
            logEntry(`<span class="text-primary fw-semibold">O jogador</span> obtém ${roll}${hasSkillBonus ? ' (+1 passiva)' : ''}, errando o ataque.`);
        }

        document.getElementById('reroll-count').textContent = Player.rerolls;
        // Bárbaro: re-rolar bloqueado quando habilidade está ativa
        if (barbarianBonusActive) document.getElementById('btn-reroll').disabled = true;
    }

    /**
     * Teste de habilidade do inimigo (regra 3.2)
     * Sucesso >= 4 → dano variável 1 a Monster.damage
     */
    function performEnemySkillTest() {
        const roll = Math.floor(Math.random() * 6) + 1;
        const success = roll >= 4;
        document.getElementById('monster-roll').textContent = roll;
        document.getElementById('monster-roll-result').textContent = success ? '(sucesso)' : '(falha)';
        const diceImg = document.getElementById('monster-dice-img');

        if (success) {
            const dmg = Math.floor(Math.random() * Monster.damage) + 1;
            pendingPlayerDamage = dmg;
            document.getElementById('monster-attack-text').textContent = `...causa ${dmg} de dano!`;
            diceImg.classList.remove('d-none');
            logEntry(`<span class="text-danger fw-semibold">O oponente</span> obtém ${roll}, acertando o ataque e causando ${dmg} ponto(s) de dano.`);
        } else {
            pendingPlayerDamage = 0;
            document.getElementById('monster-attack-text').textContent = '...você desvia do ataque!';
            diceImg.classList.add('d-none');
            logEntry(`<span class="text-danger fw-semibold">O oponente</span> obtém ${roll}, errando o ataque. <span class="text-primary fw-semibold">O jogador</span> desvia.`);
        }
    }

    // Botão Atacar
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-accept')) return;
        const isCombat = !!document.querySelector(
            '.card-option-section[data-type="monster"]:not(.d-none), .card-option-section[data-type="boss"]:not(.d-none)'
        );

        // Preserva pendingMonsterDamage se Mago ou Bárbaro têm habilidade ativa
        if (!abilityActiveThisTurn && !barbarianBonusActive) pendingPlayerDamage = pendingMonsterDamage = 0;
        else pendingPlayerDamage = 0;

        performSkillTest();
        if (isCombat) performEnemySkillTest();

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDiceResult')).show();
    });

    // Re-rolar: só refaz o teste do jogador (regra 5)
    document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-reroll') && Player.useReroll()) {
            performSkillTest();
        }
    });

    document.getElementById('modalDiceResult').addEventListener('hide.bs.modal', () => {
        const isCombat = !!document.querySelector(
            '.card-option-section[data-type="monster"]:not(.d-none), .card-option-section[data-type="boss"]:not(.d-none)'
        );
        if (isCombat) {
            if (pendingMonsterDamage > 0) Monster.applyDamage(pendingMonsterDamage);
            if (pendingPlayerDamage  > 0) Player.applyDamage(pendingPlayerDamage);
        }
        flushLog();
        pendingMonsterDamage = pendingPlayerDamage = 0;
        abilityActiveThisTurn = false;
        barbarianBonusActive  = false;

        if (Player.currentHp === 0) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGameOver')).show();
            return;
        }

        if (isCombat && Monster.currentHp === 0) {
            document.querySelectorAll('#btn-accept, #btn-skip, #btn-use-ability').forEach(b => b.classList.add('d-none'));
            // Mostra o btn-continue da section visível (monster ou boss)
            const activeSection = document.querySelector(
                '.card-option-section[data-type="monster"]:not(.d-none), .card-option-section[data-type="boss"]:not(.d-none)'
            );
            if (activeSection) {
                const btnContinue = activeSection.querySelector('#btn-continue');
                if (btnContinue) btnContinue.classList.remove('d-none');
            }
        }
    });
}
