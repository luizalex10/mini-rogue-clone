/**
 * hero-selector.js
 * Inicializa o carrossel de seleção de herói em heroes.html.
 * Ao selecionar, embaralha o deck (Fisher-Yates), inicia a sessão e redireciona para game.html.
 */
function initHeroSelector() {
  fetch('assets/json/heroes.json')
    .then(r => r.json())
    .then(heroes => {
      const inner = document.getElementById('hero-carousel-inner');

      heroes.forEach((hero, i) => {
        const item = document.createElement('div');
        item.className = 'carousel-item' + (i === 0 ? ' active' : '');
        item.dataset.code = hero.code;
        item.innerHTML = `
          <div class="card shadow-sm mx-auto text-center" style="max-width:280px">
            <div class="card-header text-capitalize fw-semibold">${hero.name}</div>
            <div class="card-body d-flex justify-content-center align-items-center p-3">
              <img src="assets/img/heroes/${hero.filename}" width="256" height="256" alt="${hero.name}">
            </div>
            <div class="card-footer text-muted">${hero.type || '&nbsp;'}</div>
          </div>
        `;
        inner.appendChild(item);
      });

      function updateHeroInfo() {
        const activeItem = document.querySelector('#hero-carousel .carousel-item.active');
        const code = parseInt(activeItem.dataset.code);
        const hero = heroes.find(h => h.code === code);
        if (!hero) return;
        document.getElementById('hero-min-atk').textContent            = hero['min-atk']           ?? '—';
        document.getElementById('hero-max-atk').textContent            = hero['max-atk']           ?? '—';
        document.getElementById('hero-initial-hp').textContent         = hero['initial-hp']        ?? '—';
        document.getElementById('hero-description').textContent         = hero.description          || '—';
        document.getElementById('hero-passive-description').textContent = hero['passive-description'] || '—';
        document.getElementById('hero-ability-description').textContent = hero['ability-description'] || '—';
      }

      // Popula ao iniciar
      updateHeroInfo();

      // Atualiza ao mudar o slide
      document.getElementById('hero-carousel').addEventListener('slid.bs.carousel', updateHeroInfo);

      document.getElementById('btn-select-hero').addEventListener('click', () => {
        const activeItem = document.querySelector('#hero-carousel .carousel-item.active');
        const code = parseInt(activeItem.dataset.code);
        const hero = heroes.find(h => h.code === code);
        if (!hero) return;

        const mode = sessionStorage.getItem('pending-game-mode') || 'normal';
        const cardsFile = mode === 'remix' ? 'assets/json/cards-remix.json' : 'assets/json/cards.json';

        fetch(cardsFile)
          .then(r => r.json())
          .then(images => {
            let deck = [...images];

            // Fisher-Yates
            function shuffle(arr) {
              for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
              }
            }

            // Regra 1: sem salas iguais consecutivas (máx 100 tentativas)
            function hasConsecutiveDupes(arr) {
              for (let i = 0; i < arr.length - 1; i++) {
                if (arr[i].type === arr[i + 1].type) return true;
              }
              return false;
            }

            shuffle(deck);
            let attempts = 0;
            while (hasConsecutiveDupes(deck) && attempts < 100) {
              shuffle(deck);
              attempts++;
            }

            // Regra 2: primeira carta não pode ser food — move para posição aleatória >= 3
            if (deck[0].type === 'food') {
              const pos = Math.floor(Math.random() * (deck.length - 3)) + 3;
              const [card] = deck.splice(0, 1);
              deck.splice(pos, 0, card);
            }

            Session.start(hero, sessionStorage.getItem('pending-game-mode') || 'normal');
            sessionStorage.removeItem('pending-game-mode');
            Player.initFromHero(hero);
            Player.setDeck(deck);
            window.location.href = 'game.html';
          });
      });
    });
}
