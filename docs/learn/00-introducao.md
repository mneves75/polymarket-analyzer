# Capítulo 00: Introdução ao Polymarket Analyzer

> **"Se você não consegue explicar algo de forma simples, você não entende bem o suficiente."**
> — Richard Feynman

---

## 1. O Que é Este Projeto? (Explicação para Minha Avó)

Imagine que você tem uma bolsa de valores, mas em vez de comprar e vender ações de empresas como Apple ou Google, você está apostando em eventos do mundo real. Por exemplo:

- "O Brasil vai ganhar a Copa do Mundo?"
- "Será que a temperatura global vai subir 2°C até 2030?"
- "Tal candidato vai vencer as eleições?"

Cada uma dessas perguntas é um **mercado de previsão**. As pessoas compram e vendem "tokens" que representam "Sim" ou "Não" para cada pergunta. O preço do token mostra o quão provável a comunidade acha que o evento vai acontecer.

**O Polymarket Analyzer** é uma ferramenta que permite monitorar esses mercados em tempo real, diretamente do seu terminal de computador. É como ter um painel de controle da sabedoria das multidões.

---

## 2. Por Que Isso Existe? (O Problema Que Resolvemos)

### O Problema

A Polymarket é uma plataforma de mercados de previsão baseada em blockchain. Ela possui APIs públicas que fornecem dados sobre:

- Mercados ativos
- Preços em tempo real
- Livro de ofertas (order book)
- Histórico de preços
- Maiores detentores de tokens

**Mas**, esses dados estão espalhados em diferentes APIs, e não existe uma interface oficial para monitorar tudo em tempo real de forma eficiente.

### A Solução

O Polymarket Analyzer:

1. **Centraliza dados de múltiplas fontes** (Gamma API, CLOB REST/WS, Data API)
2. **Fornece uma interface visual rica** no terminal (TUI - Terminal User Interface)
3. **Atualiza em tempo real** usando WebSockets
4. **Permite exportar snapshots** para análise posterior
5. **Respeita rate limits** das APIs (não derruba o servidor)

---

## 3. Como Funciona? (Visão de Helicóptero)

A aplicação segue esta arquitetura simples:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Polymarket Analyzer                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Gamma API    │    │ CLOB API     │    │ Data API     │      │
│  │ (Descoberta) │    │ (Preços)     │    │ (Detentores) │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                    │              │
│         └───────────────────┼────────────────────┘              │
│                             ▼                                    │
│                  ┌────────────────────┐                         │
│                  │   Motor de Dados   │                         │
│                  │   (api.ts, ws.ts)  │                         │
│                  └─────────┬──────────┘                         │
│                            ▼                                     │
│                  ┌────────────────────┐                         │
│                  │  Interface Terminal│                         │
│                  │   (blessed/tui.ts) │                         │
│                  └────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados Simplificado

1. **Descoberta**: A aplicação descobre quais mercados estão ativos via Gamma API
2. **Conexão**: Conecta ao WebSocket da Polymarket para receber atualizações em tempo real
3. **Coleta**: Busca dados adicionais (livro de ofertas, histórico) via REST API
4. **Processamento**: Normaliza e organiza os dados
5. **Exibição**: Renderiza tudo no terminal com uma interface interativa

---

## 4. Conceitos Fundamentais

### 4.1 O Que é uma API?

**API** significa *Application Programming Interface* (Interface de Programação de Aplicações).

Pense na API como um **garçom em um restaurante**:

- Você (o cliente) não pode entrar na cozinha
- Você dá o pedido ao garçom
- O garçom leva o pedido para a cozinha
- A cozinha prepara o prato
- O garçom traz o prato para você

Da mesma forma:
- Seu código não pode acessar diretamente os dados da Polymarket
- Seu código faz uma "requisição" para a API
- A API processa a requisição
- A API retorna os dados para seu código

### 4.2 REST vs WebSocket

Existem duas formas principais de comunicação com a Polymarket:

#### REST (Representational State Transfer)

É como **enviar uma carta**:
- Você escreve uma carta (faz uma requisição HTTP)
- Envia para o destinatário (servidor)
- O destinatário lê e responde (resposta HTTP)
- A comunicação **termina aí**

**Características:**
- ✅ Simples e direto
- ✅ Funciona bem para dados que não mudam rapidamente
- ❌ Você precisa perguntar de novo (polling) para saber se algo mudou
- ❌ Gasta recursos com requisições repetidas

**Exemplo no código:** Veja `src/api.ts` nas linhas 22-36:

```typescript
export async function fetchEvents(limit = 10, offset = 0) {
  const url = withQuery(`${CONFIG.gammaBase}/events`, {
    limit,
    offset,
    closed: false,
    active: true,
    order: "id",
    ascending: false
  });
  const res = await fetchJson<unknown>(url);
  if (Array.isArray(res)) return res as GammaEvent[];
  // ...
}
```

Aqui estamos **perguntando** ao servidor: "Quais são os eventos ativos?"

#### WebSocket

É como **fazer uma chamada telefônica**:
- Você disca o número (abre a conexão)
- A linha permanece aberta
- Ambos podem falar a qualquer momento
- A conexão só fecha quando alguém desliga

**Características:**
- � Comunicação **bidirecional** em tempo real
- ✅ O servidor pode enviar dados quando quiser (push)
- ✅ Ideal para dados que mudam rapidamente (preços!)
- ❌ Mais complexo de implementar
- ❌ Precisa gerenciar reconexões

**Exemplo no código:** Veja `src/ws.ts` (será detalhado no Capítulo 4)

### 4.3 Livro de Ofertas (Order Book)

O **livro de ofertas** é como uma lista de todas as pessoas querendo comprar ou vender um token.

**Exemplo Prático:**

Imagine que você quer comprar um token "Sim" do mercado "O Brasil vai ganhar a Copa?". O livro de ofertas mostra:

```
COMPRADORES (BIDS)        VENDEDORES (ASKS)
─────────────────────────────────────────────
65¢ - 100 tokens          67¢ - 50 tokens
64¢ - 200 tokens          68¢ - 100 tokens
63¢ - 150 tokens          69¢ - 75 tokens
62¢ - 300 tokens          70¢ - 200 tokens
61¢ - 50 tokens           71¢ - 150 tokens
```

- **Best Bid**: 65¢ (o maior preço que alguém quer pagar)
- **Best Ask**: 67¢ (o menor preço que alguém quer vender)
- **Spread**: 2¢ (diferença entre bid e ask)
- **Midpoint**: 66¢ (ponto médio entre bid e ask)

No código, isso é processado em `src/api.ts` na função `getOrderbook()`.

### 4.4 O Que é TUI?

**TUI** significa *Terminal User Interface* (Interface de Usuário em Terminal).

É uma interface gráfica que roda **dentro do terminal**, sem precisar de janelas, botões ou mouse. É como os programas antigos de DOS, mas modernos.

**Exemplo de TUI:**

```
┌────────────────────────────────────────────────────────────┐
│  Polymarket TUI Demo                    [12:34:56] [WS: ●] │
├────────────────────────────────────────────────────────────┤
│  RADAR                                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔴 Trump vence eleição 2024?      Sim   65¢  +2.3%   │  │
│  │ 🔴 Brasil Copa do Mundo 2026?     Não  72¢  -1.1%   │  │
│  │ 🟢 BTC > $100k até fim 2025?      Sim   45¢  +0.5%   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  MARKET DETAILS                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Event:   Eleições EUA 2024                           │  │
│  │ Question: Trump vence a eleição presidencial?        │  │
│  │ Condition ID: 0x1234...abcd                          │  │
│  │                                                         │  │
│  │ PREÇO ATUAL: 65¢                                      │  │
│  │ Bid: 64¢  Ask: 66¢  Spread: 2¢  Last: 65¢            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Vantagens do TUI:**
- ✅ Leve e rápido
- ✅ Funciona em qualquer terminal
- ✅ Pode ser controlado apenas com teclado
- ✅ Perfeito para servidores remotos (SSH)
- ✅ Aparência "hacker profissional" 😎

Este projeto usa a biblioteca **blessed** (`src/tui.ts`) para criar a interface.

---

## 5. Estrutura do Projeto

```
polymarket-analyzer/
├── src/                    # Código fonte
│   ├── index.ts           # Ponto de entrada da CLI
│   ├── config.ts          # Configurações e constantes
│   ├── api.ts             # Cliente REST (todas as APIs)
│   ├── ws.ts              # Cliente WebSocket
│   ├── http.ts            # Cliente HTTP com rate limiting
│   ├── tui.ts             # Interface de terminal
│   ├── market.ts          # Lógica de mercados
│   ├── parsers.ts         # Utilitários de parsing
│   ├── utils.ts           # Funções auxiliares
│   ├── logger.ts          # Sistema de logging
│   └── rateLimiter.ts     # Controle de rate limit
│
├── tests/                 # Testes
│   ├── api.test.ts
│   ├── cli.test.ts
│   ├── parsers.test.ts
│   └── ws.test.ts
│
├── docs/                  # Documentação
│   └── learn/            # ← Você está aqui!
│
├── package.json           # Dependências e scripts
├── tsconfig.json          # Configuração TypeScript
└── README.md              # Documentação rápida
```

---

## 6. Tecnologias Utilizadas

### 6.1 Bun

O **Bun** é um runtime moderno para JavaScript/TypeScript, criado como uma alternativa ao Node.js.

**Por que Bun?**
- ⚡ **28x mais rápido** que npm para instalar pacotes
- ⚡ **3x mais rápido** que Node.js para executar código
- 📦 **TypeScript nativo** (não precisa transpilar)
- 🔧 **Built-in test runner**
- 📦 **Built-in bundler**

**Comparativo:**

```bash
# Node.js + npm
npm install          # Lento...
npx ts-node src.ts  # Muito lento...

# Bun
bun install          # 28x mais rápido
bun run src.ts       # 3x mais rápido, TypeScript nativo!
```

**No projeto:** Veja o shebang na linha 1 de `src/index.ts`:

```typescript
#!/usr/bin/env bun
// Isso diz ao sistema para usar Bun para executar este arquivo
```

### 6.2 TypeScript

**TypeScript** é JavaScript com tipos.

**Por que TypeScript?**

Imagine que você está escrevendo um email e o autocorrect avisa quando você erra uma palavra. TypeScript faz isso com código:

```typescript
// JavaScript (sem tipos) - Erro só aparece em runtime
function somar(a, b) {
  return a + b;
}
somar("2", 3);  // "23" - Opa! Não era isso que queríamos...

// TypeScript (com tipos) - Erro aparece no editor
function somar(a: number, b: number): number {
  return a + b;
}
somar("2", 3);  // ❌ Erro de compilação: Argumento do tipo string
                // não pode ser atribuído ao parâmetro do tipo number
```

**Configuração do projeto:** Veja `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,        // Modo estrito (mais segurança)
    "target": "ES2022",    // JavaScript moderno
    "noEmit": true         // Não gera arquivos .js (Bun executa direto)
  }
}
```

### 6.3 Blessed

**Blessed** é uma biblioteca para criar interfaces de terminal ricas.

```bash
npm install blessed
```

Ela fornece:
- Caixas, tabelas, listas
- Cores e formatação
- Captura de teclado
- Layout responsivo

**Exemplo simples:**

```typescript
import blessed from "blessed";

// Cria a tela
const screen = blessed.screen();

// Cria uma caixa de texto
const box = blessed.box({
  top: "center",
  left: "center",
  width: "50%",
  height: "50%",
  content: "Hello, World!",
  border: { type: "line" }
});

screen.append(box);
screen.render();
```

No projeto, a interface completa está em `src/tui.ts` (682 linhas!).

---

## 7. Como Executar o Projeto

### Pré-requisitos

1. Instalar Bun: `curl -fsSL https://bun.sh/install | bash`
2. Clonar o projeto
3. Instalar dependências

### Comandos Disponíveis

```bash
# Instalar dependências
bun install

# Executar interface gráfica no terminal
bun run dev
# ou
bun run src/index.ts --tui

# Exportar snapshot JSON
bun run snapshot

# Listar mercados disponíveis
bun run markets

# Executar testes
bun test

# Verificar tipos TypeScript
bun typecheck
```

### Primeira Execução

```bash
# 1. Entre no diretório do projeto
cd polymarket-analyzer

# 2. Instale as dependências
bun install

# 3. Execute o dashboard
bun run dev
```

Você verá algo assim:

```
┌────────────────────────────────────────────────────────────┐
│  Polymarket TUI Demo                    [12:34:56] [WS: ●] │
├────────────────────────────────────────────────────────────┤
│  Carregando mercados...                                     │
└────────────────────────────────────────────────────────────┘
```

Após alguns segundos, a interface completa aparecerá com todos os dados.

---

## 8. Conceitos de Mercado de Previsão

### 8.1 Como Funciona um Mercado de Previsão?

Um mercado de previsão é como uma bolsa de valores, mas para eventos futuros.

**Exemplo: Mercado "Trump vence em 2024?"**

1. **Criação do Mercado**: Alguém cria a pergunta com duas opções: "Sim" e "Não"
2. **Tokens**: Cada opção é um token que pode ser comprado/vendido
3. **Preços**: O preço reflete a probabilidade percebida
   - Preço de 65¢ = 65% de probabilidade
   - Preço de 30¢ = 30% de probabilidade

### 8.2 Arbitragem

**Arbitragem** é lucrar sem risco aproveitando diferenças de preço.

**Exemplo:**

```
Mercado A: "Trump vence" = 65¢
Mercado B: "Trump perde" = 40¢

Se você comprar ambos:
- Compra "Sim" por 65¢
- Compra "Não" por 40¢
- Total: 105¢

Mas um dos dois vai valer $1.00!
Prejuízo garantido de 5¢
```

Isso **não deveria acontecer** em mercados eficientes. Se acontecer, existe oportunidade de arbitragem.

### 8.3 Liquidez

**Liquidez** é a facilidade de comprar/vender sem afetar muito o preço.

**Alta liquidez:**
- Muitos compradores e vendedores
- Você pode comprar muito sem mudar o preço

**Baixa liquidez:**
- Poucos participantes
- Uma compra grande pode explodir o preço

No Polymarket Analyzer, você pode ver a profundidade do livro de ofertas para avaliar a liquidez.

---

## 9. Casos de Uso

### 9.1 Traders

Monitorar mercados em tempo real para tomar decisões de compra/venda.

### 9.2 Pesquisadores

Coletar dados sobre sentimentos e probabilidades de eventos futuros.

### 9.3 Desenvolvedores

Aprender como integrar com as APIs da Polymarket para construir seus próprios apps.

### 9.4 Cientistas de Dados

Exportar snapshots para análise preditiva e machine learning.

---

## 10. Próximos Passos

Agora que você tem uma visão geral, vamos mergulhar nos detalhes técnicos:

- **Capítulo 1**: Ecossistema Bun e TypeScript
- **Capítulo 2**: Arquitetura e Estrutura do Projeto
- **Capítulo 3**: Integração com APIs Polymarket
- **Capítulo 4**: WebSockets e Tempo Real
- **Capítulo 5**: Interface de Terminal (TUI)
- **Capítulo 6**: Tratamento de Erros e Rate Limiting
- **Capítulo 7**: Estratégias de Teste
- **Capítulo 8**: Exercícios Práticos

---

## 11. Glossário Rápido

| Termo | Significado |
|-------|-------------|
| **API** | Interface para comunicação entre sistemas |
| **REST** | Estilo arquitetural para APIs (baseado em HTTP) |
| **WebSocket** | Protocolo de comunicação bidirecional em tempo real |
| **TUI** | Interface de Usuário em Terminal |
| **Order Book** | Livro de ofertas (compradores e vendedores) |
| **Bid** | Maior preço que alguém quer pagar |
| **Ask** | Menor preço que alguém quer vender |
| **Spread** | Diferença entre bid e ask |
| **Midpoint** | Ponto médio entre bid e ask |
| **Token** | Ativo digital negociável |
| **Liquidez** | Facilidade de comprar/vender |
| **Rate Limit** | Limite de requisições por período |
| **Snapshot** | Foto instantânea do estado dos dados |
| **Condition ID** | Identificador único de um mercado |
| **Slug** | URL amigável para identificar recursos |

---

## 12. Recursos Adicionais

- **Documentação Bun**: https://bun.sh/docs
- **Documentação TypeScript**: https://www.typescriptlang.org/docs/
- **Documentação Blessed**: https://github.com/chjj/blessed
- **Documentação Polymarket**: https://docs.polymarket.com

---

**Exercício Rápido #1: Sua Primeira Execução**

Tente executar o projeto você mesmo:

```bash
# 1. Instale as dependências (se ainda não fez)
bun install

# 2. Execute o dashboard
bun run dev

# 3. Explore a interface:
#    - Pressione 'n' para ir ao próximo mercado
#    - Pressione 'p' para voltar ao mercado anterior
#    - Pressione 'o' para trocar entre outcomes
#    - Pressione 's' para salvar um snapshot
#    - Pressione 'q' para sair
```

**Perguntas para reflexão:**
1. Quantos mercados você consegue ver na lista?
2. Qual é o mercado com maior volume de negociação?
3. Como o preço muda quando você troca entre outcomes?

---

**Próximo Capítulo:** Ecossistema Bun e TypeScript

[Continue para o Capítulo 1](./01-ecossistema-bun-typescript.md)
