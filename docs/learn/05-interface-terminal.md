# Capítulo 05: Interface de Terminal (TUI)

> **"A melhor interface é nenhuma interface. Mas quando precisa ser, seja simples e eficiente."**
> — Principle of UI Design

---

## 1. Introdução ao TUI

### 1.1 O Que é TUI?

**TUI** (*Terminal User Interface*) é uma interface de usuário que roda no terminal de comando, usando texto e caracteres especiais para criar elementos visuais como caixas, tabelas e menus.

**Exemplos de TUI:**

```
┌──────────────────────────────────────────────────────────────┐
│  HTOP (monitor de processos)                                 │
├──────────────────────────────────────────────────────────────┤
│  PID  USER      PRI  SIZE  STATE  TIME  COMMAND              │
│  123  root      20   1.2G  Running 0:05  node                │
│  456  ubuntu    15   512M  Sleeping 1:23 bun                 │
│                                                              │
│  [████████████████░░░░] CPU: 75%                             │
│  [██████████░░░░░░░░░░] MEM: 50%                             │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 TUI vs GUI vs CLI

```
CLI (Command Line Interface)
────────────────────────────────────────────────────────────
$ npm install
$ bun run dev

Vantagens:
- Simples de implementar
- Leve e rápido

Desvantagens:
- Não visual
- Difícil para dados complexos

TUI (Terminal User Interface)
────────────────────────────────────────────────────────────
┌──────────────────────┐
│  📊 Dashboard        │
│  [████░░] 75%       │
└──────────────────────┘

Vantagens:
- Visual no terminal
- Interativo (teclado)
- Leve e rápido
- Funciona via SSH

Desvantagens:
- Limitado a texto
- Difícil de tornar responsivo

GUI (Graphical User Interface)
────────────────────────────────────────────────────────────
┌──────────────────────┐
│  [Gráficos bonitos]  │
│  [Imagens]           │
│  [Animações]         │
└──────────────────────┘

Vantagens:
- Visual rico
- Multimídia

Desvantagens:
- Pesado
- Requer servidor gráfico
- Difícil via SSH
```

### 1.3 Por Que Usar TUI Neste Projeto?

1. **Monitoramento em tempo real** - Perfeito para dados que mudam constantemente
2. **Leveza** - Consome poucos recursos
3. **SSH-friendly** - Funciona em servidores remotos
4. **Aparência profissional** - Parece "ferramenta de hacker"
5. **Foco nos dados** - Sem distrações visuais

---

## 2. Biblioteca Blessed

### 2.1 O Que é Blessed?

**Blessed** é uma biblioteca Node.js/Bun para criar interfaces de terminal ricas.

**Características:**
- Cria caixas, tabelas, listas
- Manipula cores e formatação
- Captura teclado e mouse
- Layout responsivo
- Animações

### 2.2 Instalando Blessed

```bash
# Já instalado no projeto
bun install

# Se precisar adicionar em outro projeto
bun add blessed
bun add -d @types/blessed
```

### 2.3 Hello World em Blessed

```typescript
import blessed from "blessed";

// Cria a tela
const screen = blessed.screen({
  smartCSR: true,       // Otimização de renderização
  title: "Meu App TUI"
});

// Cria uma caixa
const box = blessed.box({
  top: "center",
  left: "center",
  width: "50%",
  height: "50%",
  content: "Hello, World!",
  border: { type: "line" },
  style: {
    fg: "white",
    bg: "blue",
    border: { fg: "cyan" }
  }
});

// Adiciona à tela
screen.append(box);

// Renderiza
screen.render();

// Captura tecla 'q' para sair
screen.key(["q", "C-c"], () => process.exit(0));
```

---

## 3. Layout da Interface Polymarket

### 3.1 Mapa da Tela

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (linha 0)                                                 │
│ Polymarket Pulse                    [12:34:56] [WS: ●] [15/s]    │
├──────────────────────────────┬───────────────────────────────────┤
│ RADAR                         │ MARKET                           │
│ (linhas 1-30%)               │ (linhas 1-30%)                   │
│                              │                                   │
│ ┌────────────────────────┐   │ ┌─────────────────────────────┐ │
│ │ # Heat Event Outcome   │   │ │ Event: Eleições EUA 2024     │ │
│ │                        │   │ │ Question: Trump vence?       │ │
│ │ 1 🔴 ... Yes          │   │ │ Condition: 0x123...          │ │
│ │ 2 🔴 ... No           │   │ │                             │ │
│ └────────────────────────┘   │ └─────────────────────────────┘ │
├──────────────────────────────┼───────────────────────────────────┤
│ PULSE                        │ ORDERBOOK                        │
│ (linhas 31-50%)              │ (linhas 31-50%)                  │
│                              │                                   │
│ ┌────────────────────────┐   │ ┌─────────────────────────────┐ │
│ │ Bid: 65¢               │   │ │ bid    size  ask    size   │ │
│ │ Ask: 67¢               │   │ │ 0.65   1k   0.67   500     │ │
│ │ Spread: 2¢ (3.0%)      │   │ │ 0.64   2k   0.68   750     │ │
│ │ Last: 66¢              │   │ │ ...                       │ │
│ └────────────────────────┘   │ └─────────────────────────────┘ │
├──────────────────────────────┼───────────────────────────────────┤
│ HISTORY                      │ HOLDERS                          │
│ (linhas 51-70%)              │ (linhas 51-70%)                  │
│                              │                                   │
│ ┌────────────────────────┐   │ ┌─────────────────────────────┐ │
│ │ Last 30 days:          │   │ │ 1. 0xabc... 15k shares     │ │
│ │ :::::::::-.:::-::::::  │   │ │ 2. 0xdef... 12k shares     │ │
│ └────────────────────────┘   │ └─────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ ALERTS & STATUS (linhas 71-90%)                                 │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ⚠️  WS stale - reconecting...                              │  │
│ │ ℹ️  REST: 5s ago | History: 30s ago                        │  │
│ └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│ FOOTER (última linha)                                          │
│ [n]ext [p]rev [o]utcome [r]efresh [f]ilter [s]ave [q]uit       │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Código de Criação do Layout

Veja `src/tui.ts:46-170`:

```typescript
export async function runDashboard(opts: DashboardOptions) {
  // ─── CRIA A TELA ───
  const screen = blessed.screen({
    smartCSR: true,
    title: "Polymarket Pulse"
  });

  // ─── DEFINE TEMA DE CORES ───
  const THEME = {
    headerBg: "blue",
    headerFg: "white",
    border: "cyan",
    label: "cyan",
    text: "white",
    muted: "gray",
    success: "green",
    warning: "yellow",
    danger: "red",
    accent: "magenta"
  };

  // ─── CRIA COMPONENTES ───

  // Header (topo)
  const header = blessed.box({
    top: 0,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,  // Permite tags como {bold}, {red}
    style: {
      fg: THEME.headerFg,
      bg: THEME.headerBg
    }
  });

  // Radar Table (esquerda, topo)
  const radarTable = blessed.box({
    top: 1,
    left: 0,
    width: "40%",      // 40% da largura
    height: "30%",     // 30% da altura
    border: "line",
    label: "Radar",
    tags: true,
    style: {
      fg: THEME.text,
      border: { fg: THEME.border },
      label: { fg: THEME.label }
    }
  });

  // Market Box (direita, topo)
  const marketBox = blessed.box({
    top: 1,
    left: "40%",       // Começa em 40% da esquerda
    width: "60%",      // 60% da largura
    height: "30%",
    border: "line",
    label: "Market",
    tags: true,
    style: { /* ... */ }
  });

  // Pulse Box (esquerda, meio)
  const statsBox = blessed.box({
    top: "31%",        // Começa em 31% do topo
    left: 0,
    width: "40%",
    height: "20%",
    border: "line",
    label: "Pulse",
    tags: true,
    style: { /* ... */ }
  });

  // Orderbook Table (direita, meio)
  const orderbookTable = blessed.box({
    top: "31%",
    left: "40%",
    width: "60%",
    height: "20%",
    border: "line",
    label: "Orderbook",
    tags: true,
    style: { /* ... */ }
  });

  // History Box (esquerda, baixo)
  const historyBox = blessed.box({
    top: "51%",
    left: 0,
    width: "40%",
    height: "20%",
    border: "line",
    label: "History",
    tags: true,
    style: { /* ... */ }
  });

  // Holders Table (direita, baixo)
  const holdersTable = blessed.box({
    top: "51%",
    left: "40%",
    width: "60%",
    height: "20%",
    border: "line",
    label: "Holders",
    tags: true,
    style: { /* ... */ }
  });

  // Alerts Box (fundo)
  const alertsBox = blessed.box({
    top: "71%",
    left: 0,
    width: "100%",
    height: "20%",
    border: "line",
    label: "Alerts & Status",
    tags: true,
    style: { /* ... */ }
  });

  // Footer (última linha)
  const footer = blessed.box({
    bottom: 0,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,
    style: { fg: THEME.text, bg: "black" }
  });

  // ─── ADICIONA COMPONENTES À TELA ───
  screen.append(header);
  screen.append(radarTable);
  screen.append(marketBox);
  screen.append(statsBox);
  screen.append(orderbookTable);
  screen.append(historyBox);
  screen.append(holdersTable);
  screen.append(alertsBox);
  screen.append(footer);

  // ─── INICIALIZA CONTEÚDO DAS TABELAS ───
  radarTable.setContent(renderTable([[/* ... */]]));
  orderbookTable.setContent(renderTable([[/* ... */]]));
  holdersTable.setContent(renderTable([[/* ... */]]));
}
```

---

## 4. Renderização de Dados

### 4.1 Tags de Formatação

Blessed suporta tags como HTML:

```typescript
// Tags disponíveis:
box.setContent(`
  {bold}Texto em negrito{/bold}
  {underline}Texto sublinhado{/underline}
  {red}Texto vermelho{/red}
  {green-fg}Texto verde (foreground){/green-fg}
  {blue-bg}Fundo azul (background){/blue-bg}
  {blink}Texto piscando{/blink}
  {dim}Texto escurecido{/dim}
`);
```

### 4.2 Renderizando Tabelas

```typescript
// Função auxiliar para renderizar tabelas
function renderTable(rows: string[][]): string {
  return rows.map(row => row.join("  ")).join("\n");
}

// Uso
const rows = [
  ["#", "Heat", "Event", "Outcome"],
  ["1", "🔴", "Trump vence?", "Yes"],
  ["2", "🔴", "Trump vence?", "No"],
];

radarTable.setContent(renderTable(rows));
```

### 4.3 Renderizando Sparklines ASCII

```typescript
// src/utils.ts:18-31
export function asciiSparkline(series: number[], width = 30) {
  if (series.length === 0) return "(no data)";

  // Níveis visuais (do menor para o maior)
  const levels = [".", ":", "-", "=", "+", "*", "#", "%", "@"];

  const sliced = series.slice(-width);  // Últimos N pontos
  const min = Math.min(...sliced);
  const max = Math.max(...sliced);
  const range = max - min || 1;

  return sliced
    .map((v) => {
      // Normaliza valor para índice do array
      const idx = Math.floor(
        ((v - min) / range) * (levels.length - 1)
      );
      return levels[Math.max(0, Math.min(levels.length - 1, idx))];
    })
    .join("");
}

// Uso
const precos = [0.60, 0.62, 0.65, 0.63, 0.66, 0.67, 0.65];
const sparkline = asciiSparkline(precos, 30);
// Resultado: ".:==-:+*%"
```

### 4.4 Atualizando o Header

```typescript
function updateHeader() {
  const clock = new Date().toLocaleTimeString();
  const wsIndicator = wsStatus === "connected" ? "●" : "○";
  const content = `Polymarket Pulse                    [${clock}] [WS: ${wsIndicator}] [${msgRate}/s]`;
  header.setContent(content);
  screen.render();
}
```

### 4.5 Atualizando a Radar Table

```typescript
function updateRadar() {
  const filteredRadar = radarFilter
    ? radar.filter(m =>
        m.question?.toLowerCase().includes(radarFilter.toLowerCase())
      )
    : radar;

  const rows = [
    ["#", "Heat", "Event", "Outcome"].map(cell),
    ...filteredRadar.map((m, idx) => [
      String(idx + 1),
      "🔴",
      m.eventTitle?.slice(0, 30) || "N/A",
      m.outcomes[outcomeIndex]?.slice(0, 15) || "N/A"
    ].map(cell))
  ];

  radarTable.setContent(renderTable(rows));
  screen.render();
}

function cell(text: string): string {
  return padRight(text || "-", 15);
}
```

### 4.6 Atualizando o Orderbook

```typescript
function updateOrderbook() {
  if (!orderbook || orderbook.bids.length === 0 || orderbook.asks.length === 0) {
    orderbookTable.setContent("{red-fg}No orderbook data{/red-fg}");
    return;
  }

  // Combina bids e asks lado a lado
  const rows = [
    ["bid", "size", "ask", "size"].map(cell),
    ...orderbook.bids.slice(0, 10).map((bid, i) => {
      const ask = orderbook.asks[i];
      return [
        formatPrice(bid.price),
        formatNumber(bid.size),
        ask ? formatPrice(ask.price) : "-",
        ask ? formatNumber(ask.size) : "-"
      ].map(cell);
    })
  ];

  orderbookTable.setContent(renderTable(rows));
  screen.render();
}
```

---

## 5. Captura de Teclado

### 5.1 Teclas Globais

```typescript
// Captura 'q' ou Ctrl+C para sair
screen.key(["q", "C-c"], () => {
  // Cleanup
  wsConnection?.close();
  process.exit(0);
});

// Captura 'r' para refresh manual
screen.key("r", () => {
  refreshAllData();
});

// Captura 'f' ou '/' para filtro
screen.key(["f", "/"], () => {
  filterPrompt.show();
});
```

### 5.2 Navegação entre Mercados

```typescript
// 'n' = próximo mercado
screen.key("n", () => {
  if (!focusMarket) return;
  const idx = radar.findIndex(m => m.conditionId === focusMarket?.conditionId);
  if (idx < radar.length - 1) {
    focusMarket = radar[idx + 1];
    outcomeIndex = 0;
    loadMarketData(focusMarket);
  }
});

// 'p' = mercado anterior
screen.key("p", () => {
  if (!focusMarket) return;
  const idx = radar.findIndex(m => m.conditionId === focusMarket?.conditionId);
  if (idx > 0) {
    focusMarket = radar[idx - 1];
    outcomeIndex = 0;
    loadMarketData(focusMarket);
  }
});

// 'o' = trocar outcome
screen.key("o", () => {
  if (!focusMarket) return;
  outcomeIndex = (outcomeIndex + 1) % focusMarket.outcomes.length;
  loadMarketData(focusMarket);
});
```

### 5.3 Filtro de Radar

```typescript
// Prompt de filtro
const filterPrompt = blessed.prompt({
  parent: screen,
  top: "center",
  left: "center",
  width: "60%",
  height: 7,
  border: "line",
  label: "Filter radar",
  hidden: true
});

// Quando usuário pressiona Enter
filterPrompt.on("submit", (text: string) => {
  radarFilter = text;
  updateRadar();  // Atualiza radar com filtro
});

// Mostra prompt quando 'f' ou '/' é pressionado
screen.key(["f", "/"], () => {
  filterPrompt.show();
  filterPrompt.readInput((err, value) => {
    if (err) {
      filterPrompt.hide();
      return;
    }
    radarFilter = value || "";
    updateRadar();
    filterPrompt.hide();
  });
});
```

---

## 6. Loop de Atualização

### 6.1 Timer de Refresh

```typescript
// Intervalo de refresh (config.config.ts:7)
const REFRESH_MS = CONFIG.refreshMs;  // 3000ms (3 segundos)

// Timer principal
const refreshTimer = setInterval(() => {
  // 1. Atualiza dados REST
  refreshRESTData();

  // 2. Atualiza interface
  updateAllComponents();

  // 3. Renderiza tela
  screen.render();
}, REFRESH_MS);
```

### 6.2 Atualização Condicional

```typescript
// Não atualiza tudo a cada refresh
async function refreshRESTData() {
  const now = Date.now();

  // Atualiza radar a cada 60 segundos
  if (now - lastRadarAt > CONFIG.radarMs) {
    radar = await loadRadar(CONFIG.radarLimit);
    lastRadarAt = now;
  }

  // Atualiza holders a cada 60 segundos
  if (now - lastHoldersAt > CONFIG.holdersMs) {
    const holdersRaw = await getHolders(focusMarket!.conditionId!);
    holders = normalizeHolders(holdersRaw);
    lastHoldersAt = now;
  }

  // Atualiza histórico a cada 30 segundos
  if (now - lastHistoryAt > CONFIG.historyMs) {
    const historyRaw = await getPriceHistory(tokenId);
    historySeries = extractHistory(historyRaw);
    lastHistoryAt = now;
  }

  // Atualiza orderbook a cada 3 segundos (sempre)
  const orderbookRaw = await getOrderbook(tokenId);
  orderbook = normalizeOrderbook(orderbookRaw);
  lastRestAt = now;
}
```

---

## 7. Boas Práticas TUI

### 7.1 Use Cores Consistentes

```typescript
// ✅ Define um tema centralizado
const THEME = {
  headerBg: "blue",
  success: "green",
  warning: "yellow",
  danger: "red"
};

// Usa em todos os componentes
const box = blessed.box({
  style: {
    fg: THEME.text,
    bg: THEME.headerBg
  }
});
```

### 7.2 Renderize Apenas Quando Necessário

```typescript
// ❌ RUIM - Renderiza a cada mensagem WebSocket
ws.addEventListener("message", (msg) => {
  updateInterface();
  screen.render();  // Muitas renders por segundo
});

// ✅ BOM - Rate limit de renders
let renderScheduled = false;
ws.addEventListener("message", (msg) => {
  updateInterface();
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      screen.render();
      renderScheduled = false;
    });
  }
});
```

### 7.3 Use Tags Semanticamente

```typescript
// ✅ Cores indicam significado
if (priceChange > 0) {
  return `{green-fg}+${formatPct(priceChange)}{/green-fg}`;
} else if (priceChange < 0) {
  return `{red-fg}${formatPct(priceChange)}{/red-fg}`;
} else {
  return `{gray-fg}0.0%{/gray-fg}`;
}
```

### 7.4 Trate Redimensionamento

```typescript
// Blessed lida automaticamente com layout relativo
// mas você pode detectar mudanças:
screen.on("resize", () => {
  // Re-renderiza se necessário
  updateLayout();
  screen.render();
});
```

---

## 8. Exercícios Práticos

### Exercício 1: Componente de Progress Bar

Crie uma barra de progresso ASCII:

```typescript
function renderProgressBar(
  value: number,
  max: number,
  width: number = 20
): string {
  // 1. Calcula porcentagem
  // 2. Calcula quantos caracteres preencher
  // 3. Retorna string como "████████░░░░░░ 75%"
}

// Teste
console.log(renderProgressBar(75, 100, 20));
// Esperado: "███████████████░░░░ 75%"
```

### Exercício 2: Tabela de Destaque

Destaque a linha selecionada em uma tabela:

```typescript
function renderTableWithHighlight(
  rows: string[][],
  selectedIndex: number
): string {
  // 1. Renderiza cada linha
  // 2. Linha selecionada tem {inverse} (inverte cores)
  // 3. Outras linhas normais
}
```

### Exercício 3: Gráfico de Barras Vertical

Crie um gráfico de barras vertical:

```typescript
function renderVerticalBars(
  values: number[],
  height: number
): string {
  // 1. Normaliza valores para altura
  // 2. Para cada linha (de cima para baixo):
  //    - Se valor >= linha, desenha █
  //    - Senão, desenha espaço
  // 3. Retorna string com múltiplas linhas
}

// Exemplo:
// █  █
// █  █
// ████
// ████
```

---

## 9. Resumo do Capítulo

- **TUI** = Interface de usuário no terminal
- **Blessed** = Biblioteca para criar TUIs
- **Layout** = Posicionamento relativo (top, left, width, height)
- **Tags** = Formatação como HTML ({bold}, {red}, etc.)
- **Loop** = Timer de refresh + renderização
- **Input** = Captura de teclado para interação
- **Semântica** = Cores e símbolos com significado

---

## 10. Para Saber Mais

- **Blessed Documentation**: https://github.com/chjj/blessed
- **ncurses** (inspiração original): https://www.gnu.org/software/ncurses/
- **Terminal UI Design**: "Terminal UI Design Patterns" (blog posts)

---

**Próximo Capítulo:** Tratamento de Erros e Rate Limiting

[Continue para o Capítulo 6](./06-erros-rate-limiting.md)
