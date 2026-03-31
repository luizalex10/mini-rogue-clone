# Mini Rogue Clone

A web game inspired by the board game 'Mini Rogue', featuring different rules and gameplay flow.

Um dungeon crawler baseado em cartas, jogado no navegador. Cada partida é única — o baralho de salas é embaralhado ao iniciar, e o jogador avança sala por sala enfrentando monstros, coletando tesouros e sobrevivendo a armadilhas. Ao esgotar todas as salas, um chefe final é sorteado. Derrotá-lo significa vencer a partida.

## Sobre o projeto

Este projeto foi codificado quase que inteiramente utilizando a IDE [Kiro](https://kiro.dev), com o objetivo — alcançado com sucesso — de criar um produto do início ao fim, funcional e livre de bugs. O processo também serviu para reforçar o conhecimento e uso de prompts para desenvolvimento assistido por IA.

## Como jogar

1. Abra `index.html` em um servidor local (ex: Live Server, `npx serve .`)
2. Clique em **Jogar**
3. Escolha seu herói no carrossel e clique em **Selecionar Herói**
4. A cada sala, uma carta é revelada — resolva o evento e avance

## Estrutura do projeto

```
mini-rogue-clone/
├── index.html                  # Tela inicial
├── heroes.html                 # Seleção de herói
├── game.html                   # Tela principal do jogo
├── victory.html                # Tela de vitória
├── assets/
│   ├── css/                    # Estilos por componente
│   ├── img/
│   │   ├── cards/              # Imagens das salas
│   │   └── heroes/             # Imagens dos heróis
│   ├── js/
│   │   ├── card-component.js   # Renderiza a sala atual (normal e remix)
│   │   ├── card-options.js     # Lógica de ações por tipo de sala
│   │   ├── hero-selector.js    # Carrossel de seleção de herói
│   │   ├── monster.js          # Estado do inimigo
│   │   ├── player.js           # Estado e persistência do jogador
│   │   ├── session.js          # Controle de sessão e modo de jogo
│   │   └── theme-toggle.js     # Alternância de tema
│   └── json/
│       ├── cards.json          # Salas do modo Normal
│       ├── cards-remix.json    # Salas do modo Remix
│       ├── cards-boss.json     # Chefes finais
│       └── heroes.json         # Registro de heróis
└── pages/                      # Partials HTML (headers, modais, componentes)
```

## Regra geral — Teste de habilidade

Lançar um dado (1d6). Resultado **≥ 4** = sucesso em combate. Resultado **< 4** = falha. Em algumas situações, resultado **1** significa falha grave e **6** significa sucesso especial.

> A fuga usa limiar próprio: resultado **≥ 5** = sucesso.

## Tipos de sala

### Monster
O jogador enfrenta um monstro em combate por turnos.

- **Atacar**: realiza um teste de habilidade (≥ 4). Sucesso → gera dano entre `min-atk` e `max-atk` + `bonus-atk` do herói. Falha → sem dano; re-rolar disponível se houver re-rolagens
- **Fugir**: realiza um teste de habilidade (≥ 5). Sucesso → escapa e avança. Falha → opção de fuga removida
- **Usar habilidade**: uso único por partida (varia por herói)
- O inimigo também realiza um teste de habilidade (≥ 4) por turno. Sucesso → causa 1 a `damage` de dano ao jogador
- O combate termina quando o HP do inimigo chega a 0 → recompensa de XP e moedas conforme `exp-reward` e `coin-reward` do card
- Se o HP do jogador chegar a 0 → Game Over

**HP do monstro**: sorteado entre `min-hp` e `max-hp` definidos no card

### Boss
Funciona como Monster, com as seguintes diferenças:
- **HP sorteado entre `min-hp` e `max-hp`** do card
- **Sem opção de Fugir**
- Aparece ao esgotar todas as salas do baralho
- Derrotá-lo = vitória da partida

### Treasure
O jogador encontra um saco de moedas. Rola 1d6:

| Resultado | Recompensa |
|---|---|
| 1 | 0 moedas |
| 2–3 | 1 moeda |
| 4–5 | 2 moedas |
| 6 | 3 moedas |

### Food
O jogador encontra uma loja. Opções disponíveis (se houver moedas suficientes):

| Opção | Custo | Efeito |
|---|---|---|
| Comida | 2🪙 | +4 pontos de vida |
| Melhorar arma | 5🪙 | +1 `bonus-atk` permanente (único) |
| Re-Rolagem | 3🪙 | +1 re-rolagem |
| Nenhuma | — | Avança sem comprar |

### Weapon
O jogador encontra uma arma. Rola 1d6:

| Resultado | Recompensa |
|---|---|
| 1 | Nada |
| 2–3 | +1 re-rolagem |
| 4–5 | +2 re-rolagens |
| 6 | +3 re-rolagens e +1 experiência |

### Trap
O jogador tenta desviar de uma armadilha. Rola 1d6:

| Resultado | Efeito |
|---|---|
| 1 | Falha grave — 3 pontos de dano |
| 2–4 | Falha — 2 pontos de dano |
| 5–6 | Escapou! +1 experiência |

### Shrine
O jogador encontra um templo. Pode aceitar a fé ou ignorar.

- **Ignorar**: avança sem efeito
- **Aceitar fé**: rola 1d6

| Resultado | Efeito |
|---|---|
| 1 | "Sua fé é fraca." — nada acontece |
| 2–3 | "Aceito sua fé..." — +3 vida e +1 re-rolagem |
| 4–5 | "Sua fé é forte!" — +3 vida e +2 🛡️ escudo |
| 6 | Restaura 50% da vida perdida e +3 🛡️ escudo |

## Heróis

Cada herói possui atributos de ataque (`min-atk`, `max-atk`, `bonus-atk`) e HP inicial (`initial-hp`) que definem o intervalo de dano causado em combate e a vida com que o jogador começa a partida.

| Herói | min-atk | max-atk | bonus-atk inicial | initial-hp | initial-shield |
|---|---|---|---|---|---|
| Aventureiro | 2 | 4 | 0 | 10 | — |
| Viking | 3 | 5 | 0 | 12 | — |
| Mago | 1 | 4 | 0 | 8 | — |
| Ninja | 2 | 5 | 0 | 9 | — |
| Clérico | 1 | 4 | 0 | 11 | 1 |

### Aventureiro
- **Passiva** `gain-one-coin-on-dice-six`: ganha 1🪙 sempre que tirar 6 em qualquer dado do jogador
- **Habilidade** `tranform-exp-into-rerolls`: converte até 3 XP em re-rolagens (requer XP > 0)

### Viking
- **Passiva** `extra-two-damage-on-three-reroll`: +2 de dano se possuir 3 ou mais re-rolagens antes do cálculo
- **Habilidade** `extra-damage-always`: +3 de dano garantido no próximo ataque, mesmo em falha; re-rolar bloqueado quando ativa

### Mago
- **Passiva** `extra-re-roll-on-six`: ganha +1 re-rolagem ao tirar 6 no teste de habilidade (somente em combate e armadilhas)
- **Habilidade** `double-damage-done`: dobra o dano do próximo ataque; se falhar no teste, a habilidade é reembolsada

### Ninja
- **Passiva** `bonus-by-three-rerolls`: +1 ao resultado do teste de habilidade se possuir 3 ou mais re-rolagens
- **Habilidade** `ninja-star`: rola 1d6 e causa `ceil(resultado / 2)` de dano direto ao inimigo, sem teste de habilidade

### Clérico
- **Passiva** `bonus-by-four-lifes`: +1 ao resultado do teste de habilidade se HP atual ≤ 4; começa a partida com 1 🛡️ escudo
- **Habilidade** `life-restore`: rola 1d6 e restaura X pontos de vida

## Atributos do jogador

| Atributo | Valor inicial | Descrição |
|---|---|---|
| HP atual / máximo | varia por herói | Vida do jogador (definida por `initial-hp` no JSON do herói) |
| Experiência | 0 | Acumulada ao longo da partida |
| Moedas | 0 | Usadas na loja (Food) |
| Re-rolagens | 1 | Permite re-rolar o dado de ataque em caso de falha |
| Usos de habilidade | 1 | Uso único da habilidade do herói por partida |
| Bônus de HP | 0 | +2 de HP máximo e atual ao atingir 5 XP pela primeira vez |
| Escudo 🛡️ | varia por herói | Absorve dano antes do HP; perdido permanentemente; alguns heróis começam com pontos de escudo |

## Re-rolagem

Durante o combate, ao **falhar** no teste de habilidade, o jogador pode re-rolar — desde que tenha re-rolagens disponíveis. Re-rolar em caso de sucesso não é permitido. O dano ao inimigo só é aplicado ao confirmar clicando em **Ok**.

> Exceção: Viking com habilidade `extra-damage-always` ativa não pode re-rolar.

## Modos de jogo

### Normal
Fluxo padrão — o baralho é embaralhado e o jogador avança sala por sala na ordem definida.

### Remix
Ativado pelo botão "Jogar modo Remix" na tela inicial. Usa o baralho de `cards-remix.json` (independente de `cards.json`). A primeira sala é jogada normalmente. A partir da segunda, ao concluir cada sala o jogador vê até duas opções de próxima sala e escolhe uma — a outra é descartada da partida. Quando restar apenas uma sala disponível, ela é apresentada como única opção. Ao esgotar o deck, o boss é apresentado como única opção antes do confronto final.

O modo é persistido no `localStorage` via `game-mode` e lido por `Session.getMode()`.

## Progressão de salas

O baralho é embaralhado (Fisher-Yates) ao iniciar uma nova partida e salvo no `localStorage`. Após o embaralhamento, duas regras são aplicadas:

1. Se houver salas do mesmo tipo consecutivas, o baralho é reembaralhado até que não haja — limite de 100 tentativas
2. A primeira sala não pode ser do tipo `food`; se for, é movida para uma posição aleatória a partir da 4ª carta

O progresso avança apenas ao concluir uma sala — refreshes no navegador não contam como progresso. O estado de cada sala em andamento (resultado do dado, efeitos pendentes) é salvo no `sessionStorage` e restaurado automaticamente no refresh.

Ao entrar em cada nova sala, o jogador recupera **1 ponto de vida**.

## Persistência

- `localStorage`: estado completo do jogador (HP, XP, moedas, re-rolagens, deck, progresso, habilidade, `bonus-atk`, `bonus-hp`, `shield`), sessão ativa, modo de jogo (`game-mode`) e preferência de tema (`bs-theme`)
- `sessionStorage`: estado temporário da sala atual (HP/dano/recompensas do inimigo, log de batalha, flag `room-completed`)

Refreshes manuais restauram o estado da sala atual sem perder progresso.

## Telas

| Tela | Descrição |
|---|---|
| `index.html` | Tela inicial — verifica sessão ativa e redireciona |
| `heroes.html` | Seleção de herói com carrossel e informações |
| `game.html` | Tela principal do jogo |
| `victory.html` | Tela de vitória ao derrotar o boss final — exibe stats e header completo do jogador |

`index.html` e `heroes.html` utilizam `pages/header-minimal.html` (apenas botão de tema). `game.html` e `victory.html` utilizam `pages/header.html` (status completo do jogador).

## Tecnologias

- HTML5, CSS3, JavaScript (ES6+, vanilla)
- [Bootstrap 5](https://getbootstrap.com/) — estilização e componentes
- Sem build step, bundler ou framework

## Assets e Créditos

Alguns ícones e imagens utilizados neste projeto foram obtidos em [Flaticon](https://www.flaticon.com/).

### Contribuidores de assets

- **[Flaticon](https://www.flaticon.com/)** — ícones e ilustrações utilizados nas cartas, heróis e interface do jogo
- **Icons created by [max.icons](https://www.flaticon.com/authors/max-icons) — Flaticon**
- **Icons created by [Freepik](https://www.flaticon.com/authors/freepik) — Flaticon**
