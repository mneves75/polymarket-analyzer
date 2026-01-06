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

## 9. Resumo

- **Unit tests** = Rápidos, isolados, muitos
- **Integration tests** = Médios, reais, alguns
- **E2E tests** = Lentos, completos, poucos
- **Bun test** = Runner embutido, rápido
- **AAA** = Arrange-Act-Assert pattern
- **Mocks** = Simulam dependências externas
- **Coverage** = % de código testado (meta: >80%)

---

## 10. Para Saber Mais

- **Bun Test Docs**: https://bun.sh/docs/test
- **Testing JavaScript**: "Testing JavaScript Applications" (Mehul Jain)
- **TDD**: "Test-Driven Development" (Kent Beck)

---

**Próximo Capítulo:** Exercícios Práticos Completos

[Continue para o Capítulo 8](./08-exercicios-completos.md)
