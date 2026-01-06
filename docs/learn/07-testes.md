# Capítulo 07: Estratégias de Teste

> **"Testes não garantem que não há bugs, mas permitem dormir tranquilo sabendo onde procurá-los."**
> — Anônimo

---

## 1. Introdução a Testes

### 1.1 Por Que Testar?

```
SEM TESTES:
────────────────────────────────────────────────────────────
Código → Produção → Bug em produção → Usuário furioso 😡
   ✅        ❌            💥               😠

COM TESTES:
────────────────────────────────────────────────────────────
Código → Testes → Bug encontrado → Corrigido → Produção ✅
   ✅        ✅           🐛            🔧         😊
```

### 1.1 Tipos de Testes

```
┌─────────────────────────────────────────────────────────────┐
│                    PIRÂMIDE DE TESTES                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ▲                                         │
│                   / \     E2E Tests                         │
│                  /───\    (Poucos, lentos)                   │
│                 /     \                                      │
│                /───────\ Integration Tests                   │
│               /─────────\ (Alguns, médios)                   │
│              /───────────\                                   │
│             /─────────────\ Unit Tests                       │
│            /───────────────\(Muitos, rápidos)                │
│           /─────────────────\                                │
│                                                              │
│  Mais testes unitários, menos E2E                           │
│  Testes rápidos → Feedback rápido → Desenvolvimento rápido  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Bun Test Runner

### 2.1 O Que é Bun Test?

**Bun Test** é o test runner embutido do Bun, similar ao Jest ou Vitest, mas mais rápido.

**Características:**
- ⚡ Mais rápido que Jest/Vitest
- 🔧 Built-in (não precisa instalar nada)
- 📝 Mesma sintaxe que Jest
- 🎨 Watch mode
- 📊 Coverage integrado

### 2.2 Escrevendo Seu Primeiro Teste

```typescript
// src/math.ts
export function somar(a: number, b: number): number {
  return a + b;
}

// tests/math.test.ts
import { describe, it, expect } from "bun:test";
import { somar } from "../src/math";

describe("somar", () => {
  it("soma dois números positivos", () => {
    expect(somar(2, 3)).toBe(5);
  });

  it("soma números negativos", () => {
    expect(somar(-2, -3)).toBe(-5);
  });

  it("soma zero", () => {
    expect(somar(0, 0)).toBe(0);
  });
});
```

**Executar:**
```bash
bun test tests/math.test.ts
```

### 2.3 Matchers Comuns

```typescript
// Igualdade
expect(valor).toBe(5);              // ===
expect(valor).toEqual({ a: 1 });    // deep equality

// Verdadeiro/Falso
expect(valor).toBeTruthy();
expect(valor).toBeFalsy();
expect(valor).toBeDefined();
expect(valor).toBeUndefined();
expect(valor).toBeNull();

// Números
expect(valor).toBeGreaterThan(5);
expect(valor).toBeLessThan(10);
expect(valor).toBeCloseTo(0.1, 2);   // 2 casas decimais

// Strings
expect(texto).toMatch(/regex/);
expect(texto).toContain("substring");

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Exceções
expect(() => funcao()).toThrow();
expect(() => funcao()).toThrow("mensagem");
```

---

## 3. Testes no Projeto Polymarket

### 3.1 Estrutura de Testes

```
tests/
├── api.test.ts       # Testes de normalização de APIs
├── cli.test.ts       # Testes smoke da CLI
├── parsers.test.ts   # Testes de parsing de dados
└── ws.test.ts        # Testes de WebSocket
```

### 3.2 Teste de Normalização de Mercado

Veja `tests/api.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { normalizeMarket } from "../src/api";

const market = {
  conditionId: "COND1",
  clobTokenIds: ["T1", "T2"],
  question: "Will it rain?"
};

describe("normalizeMarket", () => {
  it("defaults outcomes when missing", () => {
    const normalized = normalizeMarket(market, undefined);
    expect(normalized?.outcomes).toEqual(["YES", "NO"]);
  });

  it("parses outcomes and clobTokenIds from json strings", () => {
    const marketWithStrings = {
      conditionId: "COND2",
      clobTokenIds: "[\"A\",\"B\"]",  // String JSON!
      outcomes: "[\"Yes\",\"No\"]"    // String JSON!
    };
    const normalized = normalizeMarket(marketWithStrings, undefined);
    expect(normalized?.clobTokenIds).toEqual(["A", "B"]);
    expect(normalized?.outcomes).toEqual(["Yes", "No"]);
  });
});
```

**O Que Está Sendo Testado:**

1. **Outcomes padrão** - Se API não retornar outcomes, usa ["YES", "NO"]
2. **Parsing de strings JSON** - API pode retornar array ou string JSON

### 3.3 Teste de Parsers

Veja `tests/parsers.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { normalizeOrderbook, extractHistory } from "../src/parsers";

const book = {
  bids: [["0.4", "100"], ["0.39", "50"]],  // String numbers!
  asks: [["0.41", "120"]],
  min_order_size: "1",
  tick_size: "0.01",
  neg_risk: false
};

describe("parsers", () => {
  it("normalizes orderbook", () => {
    const ob = normalizeOrderbook(book);

    expect(ob.bids.length).toBe(2);
    expect(ob.asks.length).toBe(1);
    expect(ob.tickSize).toBeCloseTo(0.01);
  });

  it("extracts history points", () => {
    const history = { history: [{ p: "0.1" }, { p: "0.2" }] };
    const series = extractHistory(history);

    expect(series).toEqual([0.1, 0.2]);
  });
});
```

**O Que Está Sendo Testado:**

1. **Normalização de order book** - Arrays bidimensionais com strings
2. **Extração de histórico** - Campo "p" de "price"

---

## 4. Escrevendo Bons Testes

### 4.1 Testes AAA (Arrange-Act-Assert)

```typescript
describe("funcaoX", () => {
  it("faz X quando Y", () => {
    // ARRANGE - Prepara o cenário
    const input = { valor: 10 };
    const esperado = 20;

    // ACT - Executa o código testado
    const resultado = funcaoX(input);

    // ASSERT - Verifica o resultado
    expect(resultado).toBe(esperado);
  });
});
```

### 4.2 Testes Isolados

```typescript
// ❌ RUIM - Testes dependem um do outro
let contador = 0;

it("incrementa", () => {
  contador++;
  expect(contador).toBe(1);
});

it("incrementa de novo", () => {
  contador++;
  expect(contador).toBe(2);  // Falha se rodar sozinho!
});

// ✅ BOM - Cada teste é independente
it("incrementa de 0 para 1", () => {
  const c = new Contador(0);
  c.increment();
  expect(c.valor).toBe(1);
});

it("incrementa de 5 para 6", () => {
  const c = new Contador(5);
  c.increment();
  expect(c.valor).toBe(6);
});
```

### 4.3 Nomes Descritivos

```typescript
// ❌ RUIM
it("funciona", () => { });

// ✅ BOM
it("retorna erro quando conditionId está ausente", () => { });

// ✅ MELHOR (should-style)
it("should return error when conditionId is missing", () => { });
```

---

## 5. Mocks e Spies

### 5.1 Mock de Funções

```typescript
import { describe, expect, it, mock } from "bun:test";

describe("com mock", () => {
  it("mocka função externa", () => {
    // Mocka fetch
    const mockFetch = mock(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: "test" })
    }));

    // Usa mock
    const resultado = await buscarDados();

    expect(resultado).toEqual({ data: "test" });
    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
```

### 5.2 Spy de Funções

```typescript
it("spy chama função original", () => {
  const spy = mock(() => originalFunction);

  // Spy chama função original
  spy.mockImplementation((...args) => originalFunction(...args));

  const resultado = spy("argumento");

  expect(spy).toHaveBeenCalledWith("argumento");
});
```

---

## 6. Testes de Integração

### 6.1 Testando Integração com API

```typescript
describe("API Integration", () => {
  it("busca e normaliza mercado real", async () => {
    // Busca dado real da API
    const mercado = await fetchMarketBySlug("trump-wins-2024");

    // Normaliza
    const normalizado = normalizeMarket(mercado, undefined);

    // Verifica campos esperados
    expect(normalizado).toBeDefined();
    expect(normalizado?.conditionId).toBeDefined();
    expect(normalizado?.clobTokenIds.length).toBeGreaterThan(0);
  });
});
```

### 6.2 Testando WebSocket

```typescript
describe("WebSocket Integration", () => {
  it("conecta e recebe mensagens", async (done) => {
    const wsClient = connectMarketWs(["TOKEN_ID"], {
      onUpdate: (update) => {
        expect(update.assetId).toBe("TOKEN_ID");
        wsClient.close();
        done();
      }
    });
  });
});
```

---

## 7. Coverage

### 7.1 Gerando Relatório de Coverage

```bash
# Com coverage
bun test --coverage

# Output:
# src/api.ts: 85% coverage (45/53 lines)
# src/parsers.ts: 92% coverage (24/26 lines)
# src/ws.ts: 67% coverage (120/180 lines)
```

### 7.2 Metas de Coverage

```
┌─────────────────────────────────────────────────────────────┐
│  EXCELENTE:  > 80% coverage                                 │
│  BOM:       60-80% coverage                                  │
│  ACEITÁVEL: 40-60% coverage                                  │
│  RUIM:      < 40% coverage                                   │
└─────────────────────────────────────────────────────────────┘
```

**Não busque 100% coverage!** Código de UI, erros, edge cases são difíceis de testar.

---

## 8. Exercícios Práticos

### Exercício 1: Teste de Filtro

```typescript
// Código
function filtrarMercados(mercados: MarketInfo[], filtro: string): MarketInfo[] {
  return mercados.filter(m =>
    m.question?.toLowerCase().includes(filtro.toLowerCase())
  );
}

// Teste
describe("filtrarMercados", () => {
  it("deve filtrar por nome", () => {
    // Escreva teste
  });

  it("deve ser case-insensitive", () => {
    // Escreva teste
  });

  it("deve retornar vazio se nada bater", () => {
    // Escreva teste
  });
});
```

### Exercício 2: Teste de Calculadora de Spread

```typescript
// Código
function calcularSpread(bid: number, ask: number): number {
  return ((ask - bid) / ask) * 100;
}

// Teste
describe("calcularSpread", () => {
  // Escreva testes para:
  // - spread normal
  // - spread zero
  // - bid ou ask zero ou negativo
});
```

### Exercício 3: Teste com Mock

```typescript
// Teste que mocka fetchJson
describe("com mock", () => {
  it("deve usar fallback se primário falhar", async () => {
    // Mocka fetchJson para falhar na primeira chamada
    // e sucesso na segunda
  });
});
```

---

## 9. ✅ Checkpoint

**Teste seu conhecimento antes de continuar:**

1. **Qual é a diferença entre unit test, integration test e E2E test?**
   - a) Não há diferença, são sinônimos
   - b) Unit testa funções isoladas, integration testa múltiplos componentes juntos, E2E testa o sistema completo
   - c) Unit é lento, integration é rápido, E2E não existe

   <details>
   <summary>Resposta</summary>
   **b)** Unit test: testa uma função/classe isolada (rápido). Integration test: testa múltiplos componentes integrados (médio). E2E test: testa o sistema completo como usuário usaria (lento).
   </details>

2. **O que é o padrão AAA em testes?**
   - a) Always Act Automatically
   - b) Arrange-Act-Assert (Organiza-Agir-Verifica)
   - c) Automatic Application Architecture

   <details>
   <summary>Resposta</summary>
   **b)** Arrange: prepara os dados e mocks. Act: executa a função sendo testada. Assert: verifica o resultado. Exemplo: `const arr = [1,2,3]; const result = sum(arr); expect(result).toBe(6);`
   </details>

3. **Quando você deve usar mocks em testes?**
   - a) Sempre, em todos os testes
   - b) Nunca, use sempre dependências reais
   - c) Quando precisa isolar o código de dependências externas lentas ou imprevisíveis

   <details>
   <summary>Resposta</summary>
   **c)** Use mocks para APIs, bancos de dados, tempo, etc. que são lentos ou imprevisíveis. Não mock código interno do projeto (isso torna testes frágeis).
   </details>

4. **Qual é uma meta razoável de coverage (cobertura de testes)?**
   - a) 100% sempre
   - b) 80% para código de negócio, menor para UI/boilerplate
   - c) 10% é suficiente

   <details>
   <summary>Resposta</summary>
   **b)** 100% é impraticável (código de UI é difícil de testar). 80% é bom equilíbrio. Foque em código crítico de negócio, não em getters/setters triviais.
   </details>

5. **O que é um teste "flaky" (intermitente)?**
   - a) Um teste que falha aleatoriamente sem mudança de código
   - b) Um teste que demora muito para rodar
   - c) Um teste que está escrito de forma feia

   <details>
   <summary>Resposta</summary>
   **a)** Teste flaky falha às vezes e passa outras vezes sem mudança de código. Causas comuns: dependência de tempo, race conditions, dependências externas, dados compartilhados entre testes.
   </details>

**Parabéns!** Se você respondeu corretamente, está pronto para o próximo capítulo.

---

## 10. ⚠️ Common Pitfalls

### Pitfall 1: Testes Que Dependen de Ordem

**Problem:** Testes funcionam quando rodados isoladamente mas falham quando rodados juntos.

```typescript
// ❌ RUIM - Teste depende de estado global
describe("user management", () => {
  it("creates user", () => {
    createUser("alice");
    expect(getUserCount()).toBe(1);  // Assume contagem anterior = 0
  });

  it("deletes user", () => {
    deleteUser("alice");
    expect(getUserCount()).toBe(0);  // Falha se "creates user" não rodou antes
  });
});
// Problema: Se rodar só "deletes user", falha porque alice não existe

// ✅ BOM - Cada teste é independente
describe("user management", () => {
  beforeEach(() => {
    // Limpa estado antes de CADA teste
    clearAllUsers();
  });

  it("creates user", () => {
    createUser("alice");
    expect(getUserCount()).toBe(1);
  });

  it("deletes user", () => {
    createUser("alice");  // Cria no próprio teste
    deleteUser("alice");
    expect(getUserCount()).toBe(0);
  }
});
```

---

### Pitfall 2: Testes Frágeis com Mocks

**Problem:** Mudança interna na implementação quebra testes mesmo se comportamento não mudou.

```typescript
// ❌ RUIM - Mocka implementação interna
import { fetchData } from "./api";

test("fetches data", async () => {
  const spy = mock(fetchData);  // Mocka a própria função sendo testada!
  spy.mockResolvedValue({ data: "test" });
  // ...
});

// ✅ BOM - Mocka dependências externas apenas
test("fetches data from API", async () => {
  // Mocka fetch (dependência externa), não a função do projeto
  global.fetch = mock(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: "test" })
  }));

  const result = await fetchData();
  expect(result).toEqual({ data: "test" });
});
```

---

### Pitfall 3: Testes Muito Lentos

**Problem:** Suíte de testes demora 10+ minutos, ninguém quer rodar.

```typescript
// ❌ RUIM - Testes lentos
test("integration test", async () => {
  // 1. Cria database real
  await db.create();

  // 2. Faz 100 requisições HTTP reais
  for (let i = 0; i < 100; i++) {
    await fetch(`https://api.example.com/item/${i}`);
  }

  // 3. Espera 5 segundos para processamento
  await sleep(5000);

  // Teste demora 30 segundos!
});

// ✅ BOM - Testes rápidos com mocks
test("unit test", () => {
  // Tudo é mockado, roda em <10ms
  const mockDb = createMockDatabase();
  const mockFetch = mockFetch();

  const service = new Service(mockDb, mockFetch);
  service.processItems(100);

  expect(mockFetch).toHaveBeenCalledTimes(100);
});
```

**Regra geral:** Suíte inteira deve rodar em <30 segundos.

---

### Pitfall 4: Asserções Vagas

**Problem:** Testes passam mas não testam o que deveriam.

```typescript
// ❌ RUIM - Asseção muito vaga
test("parses market data", () => {
  const result = parseMarket(apiResponse);
  expect(result).toBeTruthy();  // Passa se result não é null/undefined
  // Não verifica se os dados estão corretos!
});

// ✅ BOM - Asseções específicas
test("parses market data", () => {
  const result = parseMarket(apiResponse);
  expect(result).toEqual({
    conditionId: "0x123...",
    question: "Trump will win?",
    outcomes: ["YES", "NO"],
    clobTokenIds: ["0xabc...", "0xdef..."]
  });
});
```

---

### Pitfall 5: Testes que Testam a Framework

**Problem:** Testar que a framework funciona, não seu código.

```typescript
// ❌ RUIM - Testa que TypeScript compila
test("MarketInfo type exists", () => {
  const market: MarketInfo = {};
  expect(market).toBeDefined();
  // Isso não testa NADA do seu código!
});

// ✅ BOM - Testa seu código
test("normalizes market data", () => {
  const rawMarket = {
    condition_id: "0x123",  // underscore
    outcomes: '["YES","NO"]'  // string JSON
  };
  const normalized = normalizeMarket(rawMarket);
  expect(normalized.conditionId).toBe("0x123");  // camelCase
  expect(normalized.outcomes).toEqual(["YES", "NO"]);  // array
});
```

---

### Pitfall 6: Ignorar Branches de Erro

**Problem:** Testar apenas o caminho feliz, ignorando erros.

```typescript
// ❌ RUIM - Testa apenas sucesso
test("calculates spread", () => {
  expect(calcSpread(0.60, 0.61)).toBeCloseTo(1.64, 2);
  // E se bid/ask for zero? Negativo? Undefined?
});

// ✅ BOM - Testa todos os casos
describe("calcSpread", () => {
  it("calculates normal spread", () => {
    expect(calcSpread(0.60, 0.61)).toBeCloseTo(1.64, 2);
  });

  it("returns 0 for equal prices", () => {
    expect(calcSpread(0.60, 0.60)).toBe(0);
  });

  it("throws on zero ask", () => {
    expect(() => calcSpread(0.50, 0)).toThrow("Ask cannot be zero");
  });

  it("throws on negative prices", () => {
    expect(() => calcSpread(-0.50, 0.60)).toThrow("Price cannot be negative");
  });
});
```

---

### Pitfall 7: Hardcoded Data Complexo

**Problem:** Dados de teste tão complexos que são difíceis de manter.

```typescript
// ❌ RUIM - Dados gigantescos copiados de produção
test("processes market", () => {
  const hugeMarket = {
    // 100 linhas de dados reais copiados da API
    id: "0x123abc...",
    // ...mais 99 linhas
  };
  // Difícil saber o que está sendo testado
});

// ✅ BOM - Dados mínimos e focados
test("processes market question", () => {
  const minimalMarket = {
    question: "Will it rain?",
    outcomes: ["YES", "NO"]
  };
  const result = processQuestion(minimalMarket);
  expect(result).toBe("WILL IT RAIN?");  // Testa transformação específica
});
```

---

## 11. 🔧 Troubleshooting

### Issue: Teste Passa Localmente Mas Falha no CI

**Symptoms:**
- `bun test` funciona na sua máquina
- CI falha com mesmo teste

**Diagnosis:**
1. Diferença de ambiente (Node vs Bun)
2. Diferença de timezone/hora
3. Arquivos locais não commitados
4. Race condition mais provável no CI

**Solutions:**

```typescript
// 1. Use mocks para dependências de ambiente
beforeEach(() => {
  // Mocka timezone, locale, etc.
  mockTimeZone("UTC");
});

// 2. Não dependa de sistema de arquivos
test("reads config", () => {
  // ❌ Ruim - depende de arquivo local
  const config = readConfig("./config.json");

  // ✅ Bom - mocka fs ou usa objeto
  const mockFs = { readFile: () => JSON.stringify({ key: "value" }) };
});

// 3. Adicione retry em testes flaky
test("flaky test", async () => {
  // Bun não tem retry nativo, então:
  let attempts = 0;
  while (attempts < 3) {
    try {
      await runTest();
      return;  // Sucesso
    } catch {
      attempts++;
      if (attempts >= 3) throw;
    }
  }
});

// 4. Use timeouts apropriados
test("slow operation", async () => {
  // CI pode ser mais lento
  const result = await slowOperation(10000);  // 10s timeout
}, { timeout: 15000 });  // 15s timeout para o teste
```

---

### Issue: Mock Não Funciona

**Symptoms:**
- Mock criado mas função real ainda é chamada
- `expect().toHaveBeenCalled()` falha

**Diagnosis:**
1. Import errado (função mockada não é a mesma instância)
2. Mock criado após import
3. Função não pode ser mockada (builtin, etc.)

**Solutions:**

```typescript
// ❌ RUIM - Importa antes do mock
import { fetchData } from "./api";
mock(fetchData);  // Muito tarde!

// ✅ BOM - Import dinâmico dentro do teste
test("with mock", async () => {
  const { fetchData } = await import("./api");
  mock(fetchData);
  // Agora funciona
});

// ✅ MELHOR - Usa dependency injection
class Service {
  constructor(private fetcher: Fetcher = new RealFetcher()) {}
}

test("with injection", () => {
  const mockFetcher = createMockFetcher();
  const service = new Service(mockFetcher);  // Injeta mock
  // Agora você controla a dependência
});
```

---

### Issue: Coverage Baixa Não Sobe

**Symptoms:**
- Código mudou mas coverage continua 0%

**Diagnosis:**
1. Arquivos de teste não foram encontrados
2. Padrão de nome errado
3. Código executado mas não medido

**Solutions:**

```bash
# 1. Verifique padrão de arquivo
bun test --coverage "**/*.test.ts"

# 2. Verifique que testes estão rodando
bun test --verbose

# 3. No package.json
{
  "scripts": {
    "test": "bun test **/*.test.ts --coverage"
  }
}

# 4. Verifique relatório de coverage
bun test --coverage
# Deve ver algo como:
# src/api.ts     85% (34/40 lines)
# src/http.ts    92% (48/52 lines)
# src/tui.ts     45% (200/444 lines)  ← Baixo coverage em UI é comum
```

---

### Issue: Teste Fala "Cannot find module"

**Symptoms:**
```
Error: Cannot find module "./src/api"
```

**Diagnosis:**
1. Path relativo errado
2. Teste rodando de diretório errado
3. tsconfig não configurado

**Solutions:**

```bash
# 1. Verifique path relativo
# Se teste é em tests/api.test.ts e código em src/api.ts
import { fetchMarkets } from "../src/api";  // Sobe um nível

# 2. Use path absoluto se confuso
import { fetchMarkets } from "${import.meta.dir}/../src/api";

# 3. Configure tsconfig paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# Agora pode usar:
import { fetchMarkets } from "@/api";
```

---

### Issue: Teste Passa Mas Código Está Quebrado

**Symptoms:**
- Teste passa
- Código claramente bugado quando inspecionado

**Diagnosis:**
Teste não está cobrindo o bug.

**Solutions:**

```typescript
// ❌ RUIM - Teste não checa nada
test("formatPrice", () => {
  formatPrice(0.12345);
  // Não assert! Teste sempre passa mesmo se função retornar lixo
});

// ✅ BOM - Teste verifica resultado
test("formatPrice", () => {
  const result = formatPrice(0.12345);
  expect(result).toBe("12.35¢");  // Verifica formatação correta
});

// ✅ MELHOR - Testa edge cases
describe("formatPrice", () => {
  it("formats normal price", () => {
    expect(formatPrice(0.12345)).toBe("12.35¢");
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("0¢");
  });

  it("handles very small", () => {
    expect(formatPrice(0.001)).toBe("0.1¢");
  });

  it("rounds correctly", () => {
    expect(formatPrice(0.999)).toBe("99.9¢");  // Não 100¢!
  });
});
```

---

## 12. 🎓 Design Decisions

### Decisão 1: Por que Bun Test em vez de Jest/Vitest?

**Alternativas:**

| Framework | Setup | Velocidade | Compatibilidade | Tamanho |
|-----------|-------|------------|-----------------|---------|
| **Jest** | npm install | Lento | Máxima | Grande |
| **Vitest** | npm install | Rápido | Boa | Médio |
| **Bun Test** | Zero (embutido) | Mais rápido | Boa | Zero |

**Por que Bun Test foi escolhido:**

1. ✅ **Velocidade:** 100x mais rápido que Jest
2. ✅ **Zero setup:** Já vem com Bun, sem instalar nada
3. ✅ **Compatibilidade:** Projeto já usa Bun
4. ✅ **Simultaneidade:** Roda testes em paralelo por padrão
5. ✅ **Snapshot testing:** Suporta snapshots como Jest
6. ✅ **Watch mode:** `bun test --watch` para desenvolvimento

**Comparativo de performance (artificial):**
```bash
# Jest (1000 testes)
jest                               12.4s user 3.2s system

# Vitest (1000 testes)
vitest                              4.1s user 1.1s system

# Bun Test (1000 testes)
bun test                            1.2s user 0.3s system

# Bun é ~10x mais rápido que Vitest, ~100x mais rápido que Jest
```

**Quando usar alternativas:**
- **Jest:** Projeto Node.js legado que já usa Jest
- **Vitest:** Projeto Vite + React/Next.js
- **Bun Test:** Projeto Bun novo (nosso caso) ✅

---

### Decisão 2: Testes de Integração com APIs Reais ou Mocks?

**Estratégia:**

| Tipo de Teste | Usa | Quando |
|---------------|-----|--------|
| **Unit** | 100% mocks | Sempre |
| **Integration** | APIs reais se possível | Quando API é estável e rápida |
| **E2E** | Sempre APIs reais | Sempre |

**Por que essa estratégia:**

1. **Unit tests (100% mocks):**
   - Rápido (<1ms por teste)
   - Isolado (não depende de internet)
   - Repetível (sempre mesmo resultado)

```typescript
// Unit test com mocks
test("fetchMarkets parses response", () => {
  const mockFetch = mock(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ id: "1", question: "Test?" }])
  }));

  const markets = fetchMarkets(10);
  expect(markets).toHaveLength(1);
  expect(markets[0].question).toBe("Test?");
});
```

2. **Integration tests (APIs reais quando possível):**
   - Testa integração real com Polymarket API
   - Mais confiável que mocks
   - Mais lento (100-500ms por teste)

```typescript
// Integration test com API real
test("integration: fetch real Polymarket markets", async () => {
  // Se API estiver disponível, usa real
  // Se não, usa mock gravado
  const markets = await fetchMarkets(5);

  expect(markets.length).toBeGreaterThan(0);
  expect(markets[0]).toHaveProperty("question");
  expect(markets[0]).toHaveProperty("conditionId");
}, { timeout: 5000 });  // 5s timeout
```

3. **E2E tests (sempre APIs reais):**
   - Testa fluxo completo
   - Mais lento (1-10s por teste)
   - Menos testes, mas mais valiosos

```typescript
// E2E test: fluxo completo
test("E2E: user views market in TUI", async () => {
  // 1. Inicia aplicação
  // 2. Conecta WebSocket real
  // 3. Envia comandos de teclado
  // 4. Verifica output no terminal

  // Não mocka nada! Fluxo real.
}, { timeout: 30000 });
```

---

### Decisão 3: Coverage Target: 80%, 90%, ou 100%?

**Metas:**

| Coverage | Meta | Razão |
|----------|------|-------|
| **100%** | ❌ Não | Impraticável, custo/benefício ruim |
| **90%** | ⚠️ Opcional | Para código crítico apenas |
| **80%** | ✅ Sim | Bom equilíbrio entre qualidade e esforço |

**Por que 80%:**

1. **Código de UI é difícil de testar:**
   - TUI rendering requer testes visuais complexos
   - Layout relativo é difícil de assertar
   - Event handlers precisam de setup complexo

2. **Type safety já previne muitos bugs:**
   - TypeScript captura erros em compilação
   - Não precisa testar se tipo está correto

3. **Foco em código crítico:**
   - API layer: 90%+ coverage
   - Business logic: 85%+ coverage
   - UI/rendering: 60%+ coverage aceitável

**Exemplo de coverage report:**
```
File           | Statements | Branch | Functions | Lines |
---------------|------------|--------|-----------|-------|
All files      |    82.34   |  75.12 |    86.21  | 83.45 |
 src/api.ts    |    94.12   |  90.00 |    100.00 | 94.44 |
 src/http.ts   |    89.47   |  85.71 |     90.00 | 90.00 |
 src/rateLimiter.ts | 100.00 | 100.00 |    100.00 | 100.00 |
 src/tui.ts    |    65.23   |  55.00 |     70.00 | 66.67 |
 src/utils.ts  |    78.95   |  70.00 |     80.00 | 80.00 |

Legend: ✅ >=80% target, ⚠️ 60-79% acceptable, ❌ <60% needs work
```

---

### Decisão 4: TDD ou Test-After?

**Abordagens:**

| Método | Descrição | Quando usar |
|--------|-----------|-------------|
| **TDD** | Escreve teste antes do código | Código novo, APIs |
| **Test-After** | Escreve teste depois do código | Bug fixes, código existente |
| **Test-During** | Escreve teste enquanto desenvolve | Refatorações |

**O que fazemos na prática:**

1. **Código novo (TDD ideal):**
```typescript
// 1. Escreve teste falhando
test("calculates spread", () => {
  expect(calcSpread(0.60, 0.61)).toBeCloseTo(1.64, 2);
});

// 2. Roda teste (falha)
// bun test → FAIL: calcSpread is not defined

// 3. Implementa mínimo para passar
function calcSpread(bid: number, ask: number): number {
  return ((ask - bid) / ask) * 100;
}

// 4. Teste passa!
// bun test → PASS
```

2. **Código existente (Test-After):**
```typescript
// Código já existe, adicione testes depois
// Testa como proteção contra regressões futuras
test("existing normalizeMarket function", () => {
  // ...
});
```

3. **Bug fixes (Regression test):**
```typescript
// 1. Reporta bug: "normalizeMarket falha com outcomes vazio"
// 2. Escreve teste que reproduz bug
test("handles empty outcomes", () => {
  const market = { outcomes: [] };
  expect(() => normalizeMarket(market)).not.toThrow();
});

// 3. Corrige bug
// 4. Teste passa e previne regressão
```

---

## 13. 📚 Para Saber Mais

### Documentação Oficial

- **Bun Test Documentation**: https://bun.sh/docs/test
- **Bun Test Mocking**: https://bun.sh/docs/test/mocking
- **Testing Best Practices**: https://github.com/goldbergyoni/javascript-testing-best-practices

### Livros

- **Test-Driven Development** (Kent Beck) - O livro clássico sobre TDD
- **Working Effectively with Legacy Code** (Michael Feathers) - Testar código existente
- **xUnit Test Patterns** (Gerard Meszaros) - Padrões de teste

### Artigos

- **The Bulletproof Test Suite**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Testing Philosophy**: https://martinfowler.com/bliki/TestPyramid.html
- **Why Most Unit Testing is Waste**: https://www.methodsandtools.com/archive/archivearchive.aspx?aid=79

### Vídeos

- **Testing JavaScript** (Kent C. Dodds) - YouTube
- **Test-Driven Development** (Kent Beck) - Talks

### Ferramentas

- **Istanbul/NYC** (Coverage): `bun install -g c8` (já embutido no Bun)
- **MSW** (Mock Service Worker): Para mocking APIs
- **Faker** (Fake data): `bun add faker` para gerar dados de teste

### Comunidade

- **Reddit**: r/javascript, r/testing
- **Discord**: Servidores de Bun, Jest

---

## 14. Resumo

- **Unit tests** = Rápidos, isolados, muitos
- **Integration tests** = Médios, reais, alguns
- **E2E tests** = Lentos, completos, poucos
- **Bun test** = Runner embutido, rápido
- **AAA** = Arrange-Act-Assert pattern
- **Mocks** = Simulam dependências externas
- **Coverage** = % de código testado (meta: >80%)

---

**Próximo Capítulo:** Exercícios Práticos Completos

[Continue para o Capítulo 8](./08-exercicios-completos.md)
