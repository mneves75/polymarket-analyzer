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

## 9. ✅ Checkpoint

**Teste seu conhecimento antes de continuar:**

1. **Qual é a principal diferença entre CLI, TUI e GUI?**
   - a) CLI usa mouse, TUI usa teclado, GUI usa ambos
   - b) CLI é texto puro, TUI tem elementos visuais no terminal, GUI usa janelas gráficas
   - c) Não há diferença, são sinônimos

   <details>
   <summary>Resposta</summary>
   **b)** CLI = Command Line Interface (texto puro), TUI = Terminal User Interface (elementos visuais no terminal), GUI = Graphical User Interface (janelas gráficas).
   </details>

2. **Como você cria um componente básico com Blessed?**
   ```typescript
   const box = blessed.box({
     top: "center",
     left: "center",
     width: "50%",
     height: "50%",
     content: "Hello, World!",
     border: { type: "line" },
     style: { fg: "white", bg: "blue" }
   });
   screen.append(box);
   screen.render();
   ```

3. **O que é `smartCSR` e quando você deve usá-lo?**
   - a) Uma técnica de otimização de renderização que deve ser sempre usada
   - b) Um algoritmo que atualiza apenas partes da tela que mudaram
   - c) Um tipo de layout responsivo

   <details>
   <summary>Resposta</summary>
   **b)** `smartCSR` é "cursely-style screen refreshing" - uma otimização que recalcula apenas a parte da tela que mudou, melhorando performance. Deve ser usado em praticamente todas as aplicações TUI.
   </details>

4. **Como você captura entrada de teclado em Blessed?**
   ```typescript
   screen.key(["q", "C-c"], () => {
     process.exit(0);
   });
   ```

5. **Qual é a diferença entre tags como `{bold}` e `style.fg`?**
   - `{bold}` é usado dentro de `setContent()` para formatar texto
   - `style.fg` define a cor padrão do componente
   - Tags são para formatação dinâmica, style é para configuração estática

**Parabéns!** Se você respondeu corretamente, está pronto para o próximo capítulo. Se não, revise as seções anteriores.

---

## 10. ⚠️ Common Pitfalls

### Pitfall 1: Esquecer `screen.render()`

**Problem:** Você adiciona componentes ou atualiza conteúdo mas não vê nada na tela.

```typescript
// ❌ RUIM
box.setContent("Novo conteúdo");
// Nada acontece!

// ✅ BOM
box.setContent("Novo conteúdo");
screen.render();  // Sempre chame render() após modificar
```

**Why it happens:** Blessed não atualiza a tela automaticamente a cada mudança para performance.

### Pitfall 2: Memory Leaks com Timers

**Problem:** `setInterval` nunca é limpo, causando memory leaks quando usuários navegam entre telas.

```typescript
// ❌ RUIM
setInterval(() => {
  updateData();
}, 1000);
// Timer nunca para, mesmo depois da tela ser destruída

// ✅ BOM
const timer = setInterval(() => {
  updateData();
}, 1000);

screen.on("destroy", () => {
  clearInterval(timer);  // Limpa timer ao destruir tela
});
```

### Pitfall 3: Layout Fixo vs Responsivo

**Problem:** Usar posições fixas quebram em terminais pequenos.

```typescript
// ❌ RUIM - quebra em terminais pequenos
const box = blessed.box({
  top: 10,
  left: 20,
  width: 80,
  height: 20
});

// ✅ BOM - funciona em qualquer tamanho
const box = blessed.box({
  top: "10%",
  left: "20%",
  width: "60%",
  height: "40%"
});
```

### Pitfall 4: Muitas Renders

**Problem:** Chamar `screen.render()` a cada mensagem WebSocket causa lag e alto uso de CPU.

```typescript
// ❌ RUIM - renderiza a cada mensagem
ws.addEventListener("message", (msg) => {
  updateData(msg);
  screen.render();  // Muitas renders por segundo!
});

// ✅ BOM - rate limit de renders
let renderScheduled = false;
ws.addEventListener("message", (msg) => {
  updateData(msg);
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      screen.render();
      renderScheduled = false;
    });
  }
});
```

### Pitfall 5: Ignorar Unicode/UTF-8

**Problem:** Caracteres especiais e emojis aparecem quebrados.

```typescript
// ❌ RUIM - assume ASCII
box.setContent("Preço: R$ 1.000,50");  // Pode quebrar

// ✅ BOM - usa UTF-8 explicitamente
process.stdout.write("\x1b]0;My App\x07");  // Configura terminal
box.setContent("Preço: R$ 1.000,50");
```

### Pitfall 6: Sair sem Cleanup

**Problem:** WebSocket fica aberto, timers continuam rodando, recursos não são liberados.

```typescript
// ❌ RUIM
screen.key(["q"], () => {
  process.exit(0);  // Saída brusca sem cleanup
});

// ✅ BOM
let wsConnection = null;
const timers = [];

screen.key(["q"], () => {
  // Cleanup
  wsConnection?.close();
  timers.forEach(t => clearInterval(t));

  // Saída graciosa
  process.exit(0);
});
```

### Pitfall 7: Cores Não Portáveis

**Problem:** Cores funcionam em um terminal mas não em outro.

```typescript
// ❌ RUIM - pode não funcionar em todos os terminais
style: { fg: "#FF5733" }  // Cor RGB hexadecimal

// ✅ BOM - usa cores básicas portáveis
style: { fg: "red" }  // Uma das 16 cores básicas

// ✅ MELHOR - usa palette com fallback
style: {
  fg: THEME.primaryColor || "blue"
}
```

---

## 11. 🔧 Troubleshooting

### Issue: "Cannot find module 'blessed'"

**Symptoms:**
```
Error: Cannot find module 'blessed'
```

**Diagnosis:** Dependência não instalada

**Solution:**
```bash
# Limpe node_modules e reinstale
rm -rf node_modules
bun install

# Verifique que blessed está instalado
ls node_modules/blessed
```

**Prevention:** Sempre rode `bun install` após clonar o projeto

---

### Issue: TUI aparece distorcida

**Symptoms:**
- Linhas não se alinham
- Texto sobreposto
- Caixas com caracteres estrangeiros

**Diagnosis:**
1. Terminal muito pequeno
2. Fonte não monoespaçada
3. Codificação de caracteres incorreta

**Solutions:**

```bash
# 1. Aumente o tamanho do terminal
# Mínimo recomendado: 80 colunas x 24 linhas
# Ideal: 120 colunas x 40 linhas

# 2. Verifique fonte do terminal
# Use fonte monoespaçada (Courier, Consolas, Monaco, etc.)
# NÃO use fontes proporcionais (Arial, Helvetica, etc.)

# 3. Configure encoding (Linux/Mac)
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# No Windows, configure terminal para UTF-8
# Configurações > Hora e idioma > Administrativo > Alterar localidade do sistema
# Marque "Beta: Usar Unicode UTF-8"
```

---

### Issue: Teclas não funcionam

**Symptoms:** Pressionar teclas não faz nada

**Diagnosis:**
1. Foco no componente errado
2. Key binding incorreto
3. Terminal não envia eventos

**Solutions:**

```typescript
// 1. Verifique key binding correto
// ❌ ERRADO
screen.key("ctrl-c", () => {});  // Não funciona

// ✅ CORRETO
screen.key("C-c", () => {});  // "C-c" não "ctrl-c"

// 2. Verifique foco
box.focus();  // Se componente precisa de foco

// 3. Teste se tecla está sendo detectada
screen.key(["*"], (ch, key) => {
  console.log("Tecla pressionada:", ch, key);
});
```

---

### Issue: Performance lenta

**Symptoms:**
- TUI trava ao atualizar
- Alto uso de CPU
- Lag entre entrada e resposta

**Diagnosis:**
1. Muitas renders por segundo
2. Processamento pesado na thread principal
3. Muitos componentes sendo renderizados

**Solutions:**

```typescript
// 1. Implemente render throttling
let lastRender = 0;
const RENDER_THROTTLE = 100;  // Máximo 10 renders/segundo

function smartRender() {
  const now = Date.now();
  if (now - lastRender < RENDER_THROTTLE) {
    return;  // Skip render
  }
  lastRender = now;
  screen.render();
}

// 2. Mova processamento para worker threads
// Para operações pesadas (parse de JSON, cálculos)
import { Worker } from "worker_threads";

const worker = new Worker("./heavy-processor.ts");
worker.postMessage(largeData);
worker.on("message", (result) => {
  updateUI(result);
  smartRender();
});

// 3. Use virtual scrolling para listas grandes
// Em vez de renderizar 1000 itens, renderize apenas os visíveis
```

---

### Issue: WebSocket reconecta infinitamente

**Symptoms:** Mensagem "reconnecting..." aparece constantemente

**Diagnosis:**
1. URL incorreta
2. Servidor fora do ar
3. Autenticação falhando
4. Protocolo WebSocket não suportado

**Solutions:**

```typescript
// 1. Verifique URL
console.log("WebSocket URL:", CONFIG.clobWsBase);
// Deve começar com wss:// (não https://)

// 2. Teste conexão manualmente
// Use wscat ou ferramenta similar
bunx wscat -c wss://ws-subscriptions-clob.polymarket.com/ws/

// 3. Verifique autenticação (se necessário)
const ws = new WebSocket(url, {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});

// 4. Adicione timeout e max retries
const MAX_RETRIES = 10;
const RETRY_TIMEOUT = 60000;  // Desiste após 1 minuto
```

---

### Issue: Dados não atualizam

**Symptoms:** Valores ficam estáticos mesmo com WebSocket conectado

**Diagnosis:**
1. Event handler não registrado
2. assetId incorreto
3. Filtro bloqueando updates
4. Parse de mensagem falhando silenciosamente

**Solutions:**

```typescript
// 1. Verifique se onUpdate está registrado
wsConnection = connectMarketWs(tokenIds, {
  onUpdate: (update) => {
    console.log("Update recebido:", update);  // Debug
    // Atualiza UI
  }
});

// 2. Confirme assetId
console.log("Token esperado:", tokenId);
console.log("Asset recebido:", update.assetId);
if (update.assetId !== tokenId) {
  console.log("AssetId mismatch!");
}

// 3. Adicione logging para debug
wsConnection = connectMarketWs(tokenIds, {
  onUpdate: (update) => {
    logger.info("WebSocket update", {
      assetId: update.assetId,
      eventType: update.eventType,
      price: update.price
    });
  }
});

// 4. Verifique por erros de parse silenciosos
ws.addEventListener("message", (event) => {
  try {
    const data = JSON.parse(event.data);
    // Process data
  } catch (err) {
    logger.error("Parse error", err, { raw: event.data });
  }
});
```

---

### Issue: Erro "content is not a function"

**Symptoms:**
```
TypeError: box.content is not a function
```

**Diagnosis:** Usando método incorreto para definir conteúdo

**Solution:**
```typescript
// ❌ ERRADO
box.content("Novo conteúdo");  // content não existe

// ✅ CORRETO
box.setContent("Novo conteúdo");  // setContent é o método correto

// ❌ ERRADO
const content = box.getContent();  // getContent não existe

// ✅ CORRETO
const content = box.content;  // Acesse propriedade diretamente
```

---

## 12. 🎓 Design Decisions

### Decisão 1: Por que TUI (Terminal UI) em vez de GUI?

**Alternativas Consideradas:**

| Opção | Vantagens | Desvantagens |
|-------|-----------|--------------|
| **Web App** (React/Next.js) | Interface visual moderna, acessível | Requer servidor/browsing, difícil via SSH |
| **Desktop App** (Electron) | Nativo, gráfico rico | Pesado (~100MB), distribuição complexa |
| **CLI Simples** | Leve, fácil implementar | Não visual, difícil para dados complexos |
| **TUI (Blessed)** | Visual no terminal, leve, SSH-friendly | Limitado a texto | ✅ |

**Trade-offs Analysis:**

| Critério | Web App | Electron | CLI | **TUI** | Vencedor |
|----------|---------|----------|-----|-------|----------|
| Facilidade SSH | ❌ Difícil | ❌ Impossível | ✅ Fácil | ✅ Fácil | TUI/CLI |
| Performance | ⚠️ Browser overhead | ❌ Pesado | ✅ Leve | ✅ Leve | TUI/CLI |
| Distribuição | ⚠️ Servidor required | ⚠️ Binário grande | ✅ Single binary | ✅ Single binary | TUI/CLI |
| Visual rico | ✅ HTML/CSS | ✅ HTML/CSS | ❌ Sem visual | ⚠️ Limitado | Web |
| Aparência | ❌ Corporate | ❌ App comum | ⚠️ Simples | ✅ "Hacker" | TUI |
| Recursos | ⚠️ Limitado | ✅ Acesso total | ✅ Acesso total | ✅ Acesso total | TUI |

**Por que TUI foi escolhido:**

1. ✅ **Foco em servidores:** Muito uso em ambientes remotos via SSH
2. ✅ **Leveza:** Sem overhead de navegador/Electron
3. ✅ **Distribuição:** Single binary, fácil de instalar e compartilhar
4. ✅ **Estética:** Aparência "hacker profissional" que agrada ao público-alvo
5. ✅ **Performance:** Renderização instantânea sem latência de browser

**Cenários onde outras opções seriam melhores:**
- **Web App:** Para usuários não-técnicos que preferem interface visual amigável
- **Electron:** Se precisasse de recursos gráficos avançados (gráficos 3D, animações complexas)
- **CLI:** Para automação e scripts sem necessidade de interface visual

---

### Decisão 2: Por que Blessed em vez de alternativas?

**Alternativas:**

1. **Blessed** - Biblioteca ncurses para Node.js ✅ **ESCOLHIDO**
2. **Ink** - React para CLIs
3. **Terminal-kit** - Biblioteca alternativa
4. **Raw ANSI codes** - Sem biblioteca

**Por que Blessed:**

| Critério | Blessed | Ink | Terminal-kit | ANSI Raw |
|----------|---------|-----|--------------|----------|
| Maturidade | ✅ Estável (anos) | ✅ Estável | ⚠️ Menos popular | ✅ Universal |
| Simplicidade | ✅ API direta | ❌ Requer React | ⚠️ API complexa | ❌ Muito manual |
| Completude | ✅ Layouts, mouse, forms | ⚠️ Focado em React | ✅ Completo | ❌ Manual |
| Comunidade | ✅ Grande | ✅ React devs | ⚠️ Pequena | N/A |
| Compatibilidade | ✅ Node.js + Bun | ✅ Node.js | ✅ Node.js | ✅ Todos |
| Aprendizado | ✅ Simples | ❌ Precisa de React | ⚠️ Moderado | ⚠️ ANSI codes |

**Por que NÃO Ink:**
- Requer conhecimento de React (overhead para projeto simples)
- Abstração desnecessária para TUI simples
- Bundle size maior

**Por que NÃO Terminal-kit:**
- Menos popular → menos recursos/comunidade
- API mais complexa do que necessário
- Menos exemplos e tutoriais

**Por que NÃO ANSI Raw:**
- Muito trabalho manual (posicionamento, cores, input)
- Difícil de manter
- Reinventando a roda

---

### Decisão 3: Layout de 8 painéis ou layout simples?

**Abordagens:**

1. **Single panel** - Mostra apenas uma coisa por vez
2. **Two panels** - Radar + detalhe do mercado
3. **Eight panels** - Radar, Market, Pulse, Orderbook, History, Holders, Alerts, Footer ✅ **ESCOLHIDO**

**Por que 8 painéis:**

- ✅ **Visibilidade completa:** Tudo importante visível de uma vez
- ✅ **Eficiência:** Sem necessidade de navegar entre telas
- ✅ **Monitoramento:** Veja múltiplos mercados simultaneamente
- ✅ **Profissional:** Parece uma ferramenta de trading real

**Trade-offs:**

| Aspecto | Vantagem | Desvantagem |
|---------|----------|-------------|
| **Complexidade** | - | ❌ Mais código para gerenciar |
| **Espaço** | - | ❌ Requer terminal maior (mínimo 80x24, ideal 120x40) |
| **Aprendizado** | ✅ Tudo visível | ⚠️ Mais informações para processar |

**Se terminal é pequeno:**
```typescript
// Implementar alternância de painéis
const compactMode = process.stdout.columns < 100;

if (compactMode) {
  // Mostra apenas Radar + Market, oculta outros
  orderbookTable.hide();
  historyBox.hide();
  holdersTable.hide();
}
```

---

### Decisão 4: Atualização contínua ou on-demand?

**Abordagens:**

1. **Polling contínuo** - Atualiza a cada X segundos automaticamente ✅ **ESCOLHIDO**
2. **On-demand** - Só atualiza quando usuário pressionar 'r'
3. **Híbrido** - Algumas coisas contínuas, outras on-demand

**Por que Polling Contínuo:**

- ✅ **Tempo real:** Dados sempre frescos
- ✅ **Conveniência:** Usuário não precisa fazer nada
- ✅ **WebSocket:** Já recebemos updates em tempo real, então por que não mostrar?

**Estratégia de atualização implementada:**

| Dado | Intervalo | Razão |
|------|-----------|-------|
| **Radar** | 60 segundos | Muda pouco, lista de mercados é relativamente estática |
| **Orderbook** | 3 segundos (ou WebSocket imediato) | Muda muito, precisa estar atualizado |
| **History** | 30 segundos | Dados históricos não mudam rápido |
| **Holders** | 60 segundos | Posição de holders muda lentamente |
| **WebSocket** | Imediato | Push em tempo real quando há trades |

**Exemplo de código:**
```typescript
// src/tui.ts
function startPolling() {
  setInterval(refreshRadar, CONFIG.radarMs);      // 60s
  setInterval(refreshFocus, opts.intervalMs);     // 3s
  setInterval(refreshHistory, CONFIG.historyMs);  // 30s
  setInterval(refreshHolders, CONFIG.holdersMs);  // 60s
}
```

**Se fosse on-demand:**
```typescript
// Usuário teria que pressionar 'r' sempre
screen.key("r", () => {
  refreshAllData();
});
// Menos conveniente, mas economiza requisições
```

---

## 13. 📚 Para Saber Mais

### Documentação Oficial

- **Blessed Documentation**: https://github.com/chjj/blessed
- **Blessed Wiki**: https://github.com/chjj/blessed/wiki
- **ncurses** (inspiração original): https://www.gnu.org/software/ncurses/
- **Terminal Escape Codes**: https://gist.github.com/fnky/458734343aabd01cfb17a3a4f729679d

### Tutoriais e Artigos

- **Building Terminal UIs with Node.js**: https://blog.npmjs.org/post/164854783755/building-terminal-tools-with-node-and-babel
- **An Introduction to ncurses**: https://www.vt100.net/docs/vt100-ug/chapter3.html
- **Terminal UI Design Patterns**: Series de blog posts sobre design de TUIs

### Projetos Exemplo

- **htop** (monitor de processos): https://htop.dev/
- **btop** (sucessor moderno do htop): https://github.com/aristocratos/btop
- **lazydocker** (gerenciador Docker TUI): https://github.com/jesseduffield/lazydocker
- **lazygit** (gerenciador Git TUI): https://github.com/jesseduffield/lazygit

### Vídeos

- **Terminal UI Design**: Busque por "terminal ui design" no YouTube
- **ncurses Programming**: Tutoriais de programação ncurses em C/C++

### Comunidade

- **Reddit**: r/terminal, r/commandline
- **Discord**: Servidores de Node.js/Bun

---

## 14. Resumo do Capítulo

- **TUI** = Interface de usuário no terminal
- **Blessed** = Biblioteca para criar TUIs
- **Layout** = Posicionamento relativo (top, left, width, height)
- **Tags** = Formatação como HTML ({bold}, {red}, etc.)
- **Loop** = Timer de refresh + renderização
- **Input** = Captura de teclado para interação
- **Semântica** = Cores e símbolos com significado

---

**Próximo Capítulo:** Tratamento de Erros e Rate Limiting

[Continue para o Capítulo 6](./06-erros-rate-limiting.md)
