/**
 * card-component.js
 * Responsável por renderizar a sala atual do jogo.
 * Lê o deck embaralhado do Player e exibe o card do índice atual (Player.rooms).
 * Ao esgotar o deck, sorteia um boss de cards-boss.json.
 * O progresso só avança quando a flag 'room-completed' está no sessionStorage.
 * No modo Remix, após a primeira sala o jogador escolhe entre duas opções a cada avanço.
 */
const CardComponent = (() => {
  function render(record) {
    return `
      <div class="card-header text-center" id="card-title" style="opacity:0">${record.title}</div>
      <div class="card-body d-flex justify-content-center align-items-center p-3">
        <img src="assets/img/cards/${record.filename}" width="256" height="256"
             alt="${record.filename}" style="opacity:0;display:block;">
      </div>
      <div class="card-footer text-center" id="card-description" style="opacity:0">${record.description}</div>
    `;
  }

  // Exibe o modal de escolha Remix e resolve com o índice escolhido
  function showRemixChoice(options, bosses) {
    return new Promise(resolve => {
      const container = document.getElementById('remix-choice-options');
      container.innerHTML = '';

      options.forEach((opt, i) => {
        const isBoss = opt._isBoss;
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-secondary d-flex align-items-center gap-3 text-start w-100 p-2';
        btn.innerHTML = `
          <img src="assets/img/cards/${opt.filename}" width="56" height="56" alt="${opt.title}" class="rounded">
          <div>
            <div class="fw-semibold">${opt.title}</div>
            <div class="text-muted small">${opt.description}</div>
          </div>
        `;
        btn.addEventListener('click', () => {
          bootstrap.Modal.getInstance(document.getElementById('modalRemixChoice')).hide();
          resolve({ chosen: opt, chosenIndex: i, isBoss });
        });
        container.appendChild(btn);
      });

      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalRemixChoice')).show();
    });
  }

  function initNormal(el, deck, index) {
    if (index >= deck.length) {
      fetch('assets/json/cards-boss.json')
        .then(r => r.json())
        .then(bosses => {
          const boss = bosses[Math.floor(Math.random() * bosses.length)];
          renderCard(el, boss);
        });
      return;
    }
    const record = deck[index];
    if (!record) return;
    renderCard(el, record);
  }

  function initRemix(el, deck, index) {
    const isFirstRoom = index === 0 && !sessionStorage.getItem('room-completed-processed');

    // Primeira sala: joga normalmente sem escolha
    if (index === 0) {
      const record = deck[0];
      if (!record) return;
      renderCard(el, record);
      return;
    }

    // Monta opções: até 2 cartas do deck restante
    fetch('assets/json/cards-boss.json')
      .then(r => r.json())
      .then(bosses => {
        const options = [];

        if (index >= deck.length) {
          // Só boss disponível
          const boss = bosses[Math.floor(Math.random() * bosses.length)];
          boss._isBoss = true;
          options.push(boss);
        } else {
          options.push(deck[index]);
          if (index + 1 < deck.length) options.push(deck[index + 1]);
          // Se só uma sala restante, não adiciona boss ainda
        }

        if (options.length === 1 && !options[0]._isBoss) {
          // Só uma sala normal — sem escolha, vai direto
          renderCard(el, options[0]);
          return;
        }

        showRemixChoice(options, bosses).then(({ chosen, chosenIndex, isBoss }) => {
          if (!isBoss) {
            // Remove a carta escolhida e a não-escolhida do deck
            const chosenDeckIndex = index + chosenIndex;
            const newDeck = deck.filter((_, i) => i !== index && i !== index + 1);
            // Reinsere a escolhida na posição atual
            newDeck.splice(index, 0, chosen);
            Player.setDeck(newDeck);
          }
          renderCard(el, chosen);
        });
      });
  }

  function renderCard(el, record) {
    el.innerHTML = render(record);

    const img    = el.querySelector('img');
    const header = el.querySelector('#card-title');
    const footer = el.querySelector('#card-description');

    setTimeout(() => {
      img.style.transition = 'opacity 1s ease';
      img.style.opacity = '1';

      img.addEventListener('transitionend', () => {
        header.style.transition = 'opacity 0.5s ease';
        footer.style.transition = 'opacity 0.5s ease';
        header.style.opacity = '1';
        footer.style.opacity = '1';

        const type = record._isBoss ? 'boss' : record.type;
        const section = document.querySelector(
          type === 'boss'
            ? '.action-section[data-type="boss"]'
            : `.action-section[data-type="${type}"]`
        );
        if (section) {
          section.classList.remove('d-none');
          section.style.opacity = '0';
          section.style.transition = 'opacity 0.5s ease';
          section.style.opacity = '1';
          if (type === 'monster' || type === 'boss') Monster.init(record);
        }

        document.dispatchEvent(new CustomEvent('card:typeReady', { detail: { type } }));
      }, { once: true });
    }, 1000);
  }

  function init(selector) {
    const el = document.querySelector(selector);
    if (!el) return;

    const deck = Player.getDeck();

    if (!deck || deck.length === 0) {
      el.innerHTML = '<p class="text-danger">Deck não encontrado.</p>';
      return;
    }

    // Processa avanço de sala ANTES de avaliar o índice
    if (sessionStorage.getItem('room-completed') === '1') {
      sessionStorage.removeItem('room-completed');
      Player.addRoom();
      Player.heal(1);
    }

    const index = Player.rooms;
    const isRemix = Session.getMode() === 'remix';

    if (isRemix) {
      initRemix(el, deck, index);
    } else {
      initNormal(el, deck, index);
    }
  }

  return { render, init };
})();
