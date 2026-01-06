# Capítulo 06: Tratamento de Erros e Rate Limiting

> **"Não se trata de se algo vai dar errado, mas sim QUANDO vai dar errado."**
> — Murphy's Law for Programmers

---

## 1. Introdução ao Tratamento de Erros

### 1.1 Por Que Tratamento de Erros é Importante?

**Sistemas distribuídos falham.**

```
CO MELHOR CASO:
────────────────────────────────────────────────────────────
Cliente → API → Dados
   ✅      ✅      ✅

CASO REAL:
────────────────────────────────────────────────────────────
Cliente → API (falha!) → Dados
   ❌      ❌           ❌

Possíveis falhas:
- API fora do ar
- Timeout de rede
- Rate limit excedido
- Dados malformados
- CORS bloqueado
- SSL expirado
```

### 1.2 Pilares de Resiliência

```
┌─────────────────────────────────────────────────────────────┐
│  RESILIÊNCIA = Sistema se recupera de falhas              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. RETRY          Tenta novamente após falha               │
│  2. TIMEOUT        Não espera para sempre                    │
│  3. FALLBACK       Usa alternativa se primário falha        │
│  4. CIRCUIT BREAKER Para de tentar se está falhando muito   │
│  5. RATE LIMIT     Respeita limites do servidor            │
│  6. GRACEFUL DEGRADATION Funciona mesmo com erros           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tratamento de Erros no Código

### 2.1 Try-Catch-Finally

```typescript
// Estrutura básica
try {
  // Código que pode falhar
  const data = await fetch(url);
  return await data.json();
} catch (error) {
  // Trata erro
  console.error("Falha ao buscar dados:", error);
  return null;  // Valor padrão
} finally {
  // Sempre executa (sucesso ou erro)
  console.log("Requisição finalizada");
}
```

### 2.2 Tipos de Erros

```typescript
// Erro de rede (fetch falhou)
try {
  const res = await fetch(url);
} catch (err) {
  if (err instanceof TypeError) {
    // Network error: sem conexão, DNS falhou, etc.
    console.error("Erro de rede:", err.message);
  }
}

// Erro HTTP (resposta com status 4xx ou 5xx)
const res = await fetch(url);
if (!res.ok) {
  // res.status: 400, 401, 403, 404, 429, 500, 502, etc.
  throw new Error(`HTTP ${res.status}: ${res.statusText}`);
}

// Erro de parsing (JSON inválido)
try {
  const data = JSON.parse(jsonString);
} catch (err) {
  // SyntaxError se JSON malformado
  console.error("JSON inválido:", err);
}
```

### 2.3 Retry com Exponential Backoff

Veja `src/http.ts:42-77`:

```typescript
async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { retries = 2 } = options;
  let attempt = 0;

  while (true) {
    try {
      // Tenta requisição
      const res = await fetch(url, { ... });

      if (!res.ok) {
        const text = await res.text();

        // Verifica se deve retry
        if (shouldRetry(res.status) && attempt < retries) {
          attempt += 1;
          await backoff(attempt);  // Exponential backoff
          continue;  // Tenta de novo
        }

        // Não deve retry → lança erro
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      // Sucesso!
      return await res.json();

    } catch (err) {
      // Erro de rede ou parsing
      if (attempt < retries) {
        attempt += 1;
        await backoff(attempt);
        continue;  // Tenta de novo
      }

      // Última tentativa falhou → lança erro
      throw err;
    }
  }
}

// Função de backoff
async function backoff(attempt: number) {
  // Exponential: 200ms, 400ms, 800ms, 1600ms, ...
  const base = 200 * Math.pow(2, attempt - 1);

  // Jitter aleatório: +0-100ms
  const jitter = Math.floor(Math.random() * 100);

  await new Promise((resolve) => setTimeout(resolve, base + jitter));
}

// Deve retry?
function shouldRetry(status: number) {
  // 429 = Too Many Requests
  // 5xx = Server errors
  return status === 429 || status >= 500;
}
```

**Timeline de Retry:**

```
Tentativa 1: falha → espera 200ms + jitter →
Tentativa 2: falha → espera 400ms + jitter →
Tentativa 3: sucesso!

Total: ~600ms + jitter
```

### 2.4 Timeout

```typescript
// src/http.ts:43-44, 75
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
  const res = await fetch(url, {
    signal: controller.signal  // Aborta se timeout
  });
  // ...
} catch (err) {
  if (err instanceof Error && err.name === "AbortError") {
    throw new Error(`Timeout após ${timeoutMs}ms`);
  }
  throw err;
} finally {
  clearTimeout(timeout);  // Limpa timer
}
```

---

## 3. Rate Limiting

### 3.1 O Que é Rate Limiting?

**Rate limiting** é a limitação da taxa de requisições que um cliente pode fazer a uma API.

```
SEM RATE LIMIT:
────────────────────────────────────────────────────────────
Cliente: [envia 1000 requisições/segundo]
Servidor: 💥 (sobrecarregado, cai, bloqueia cliente)

COM RATE LIMIT:
────────────────────────────────────────────────────────────
Cliente: [quer enviar 1000 req/s]
Rate Limiter: [permite apenas 100 req/s]
Servidor: ✅ (estável, feliz)
```

### 3.2 Token Bucket Algorithm

Veja `src/rateLimiter.ts:12-33`:

```typescript
export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  async take(rule: RateLimitRule): Promise<void> {
    const now = Date.now();

    // Busca ou cria bucket
    let bucket = this.buckets.get(rule.key);

    // Se não existe ou expirou, cria novo
    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        tokens: rule.limit,     // Enche o balde
        resetAt: now + rule.windowMs  // Quando reseta
      };
      this.buckets.set(rule.key, bucket);
    }

    // Se tem tokens, consome um
    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return;  // Pode continuar imediatamente
    }

    // Balde vazio → aguarda reset
    const waitMs = Math.max(0, bucket.resetAt - now) + jitter(20, 120);
    await sleep(waitMs);

    // Recursão após espera
    return this.take(rule);
  }
}

type Bucket = {
  tokens: number;    // Tokens disponíveis
  resetAt: number;   // Timestamp de reset
};
```

**Visualização do Token Bucket:**

```
Janela de 10 segundos, limite de 100 tokens

    0s        2s        4s        6s        8s        10s
    │         │         │         │         │         │
    ██████████████████████████████████████████████████████
    100 90 80 70 60 50 40 30 20 10  0  RESET 100 90...

Token = 1 requisição permitida

Tempo 0s:   100 tokens disponíveis → pode fazer 100 req
Tempo 2s:   80 tokens (gastou 20) → pode fazer mais 80
Tempo 10s:  0 tokens → AGUARDA
Tempo 10s+: RESET → 100 tokens novamente
```

### 3.3 Rate Limits da Polymarket

Veja `src/http.ts:12-33`:

```typescript
const RATE_LIMITS = [
  // CLOB API
  { host: "clob.polymarket.com", path: "/book", limit: 1500 },
  { host: "clob.polymarket.com", path: "/price", limit: 1500 },
  { host: "clob.polymarket.com", path: "/midpoint", limit: 1500 },
  { host: "clob.polymarket.com", path: "/prices-history", limit: 1000 },
  // ... mais endpoints

  // Gamma API
  { host: "gamma-api.polymarket.com", path: "/events", limit: 500 },
  { host: "gamma-api.polymarket.com", path: "/markets", limit: 300 },

  // Data API
  { host: "data-api.polymarket.com", path: "/holders", limit: 150 },
  { host: "data-api.polymarket.com", path: "/trades", limit: 200 },
];

// Fallback para limites de host inteiro
const HOST_LIMITS = [
  { host: "clob.polymarket.com", limit: 9000 },
  { host: "gamma-api.polymarket.com", limit: 4000 },
  { host: "data-api.polymarket.com", limit: 1000 }
];
```

**Matching de Regra:**

```typescript
// src/http.ts:89-105
function matchRateLimit(url: URL) {
  const host = url.host;
  const path = url.pathname;
  let best: { host: string; path: string; limit: number } | undefined;

  // Procura endpoint específico
  for (const rule of RATE_LIMITS) {
    if (rule.host !== host) continue;
    if (path.startsWith(rule.path)) {
      // Pega o match mais específico (maior path)
      if (!best || rule.path.length > best.path.length) {
        best = rule;
      }
    }
  }

  // Se encontrou endpoint específico
  if (best) {
    return {
      key: `${host}${best.path}`,  // Identificador único
      limit: best.limit,
      windowMs: 10_000  // 10 segundos
    };
  }

  // Fallback para limite de host
  const hostRule = HOST_LIMITS.find((rule) => rule.host === host);
  if (hostRule) {
    return {
      key: host,
      limit: hostRule.limit,
      windowMs: 10_000
    };
  }

  // Sem limite known → undefined (sem rate limiting)
  return undefined;
}
```

**Exemplo de Matching:**

```
URL: https://clob.polymarket.com/book?token_id=123

1. host = "clob.polymarket.com"
2. path = "/book"

3. Procura em RATE_LIMITS:
   Encontra: { host: "clob.polymarket.com", path: "/book", limit: 1500 }

4. Resultado:
   key: "clob.polymarket.com/book"
   limit: 1500 tokens por 10 segundos
   windowMs: 10000ms
```

---

## 4. Padrões de Tratamento de Erros

### 4.1 Fallback Pattern

```typescript
// Tenta primário, usa fallback se falhar
async function getDadosComFallback(id: string) {
  try {
    return await getDadosPrimario(id);
  } catch (err) {
    console.warn("Primário falhou, usando fallback:", err);
    return await getDadosFallback(id);
  }
}
```

### 4.2 Circuit Breaker Pattern

```typescript
type CircuitState = "closed" | "open" | "half-open";

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;  // 5 falhas → abre
  private readonly timeout = 60000;  // 60s → half-open

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Circuito aberto → falha rápido
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "half-open";  // Tenta novamente
      } else {
        throw new Error("Circuito aberto");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "open";
    }
  }
}
```

### 4.3 Graceful Degradation

```typescript
// Funciona mesmo com erros
async function getDadosComDegradacao(id: string) {
  // Dados críticos
  try {
    const critical = await getCriticalData(id);
  } catch (err) {
    // Se falhar, não funciona sem
    throw err;
  }

  // Dados opcionais
  let optional = null;
  try {
    optional = await getOptionalData(id);
  } catch (err) {
    console.warn("Dados opcionais falharam, usando defaults");
    optional = getDefaultData();
  }

  return { critical, optional };
}
```

---

## 5. Logging de Erros

### 5.1 Estrutura de Log

```typescript
// src/logger.ts
interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "error",
    message,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined
  };

  console.error(JSON.stringify(entry));
}
```

### 5.2 Logging Contextual

```typescript
// ❌ RUIM - Sem contexto
console.error("Erro ao buscar dados");

// ✅ BOM - Com contexto
console.error("Erro ao buscar dados", {
  endpoint: "/markets",
  tokenId: "0x123...",
  attempt: 3,
  error: err.message
});
```

---

## 6. Boas Práticas

### 6.1 Sempre Use Timeout

```typescript
// ❌ RUIM - Pode travar para sempre
const data = await fetch(url);

// ✅ BOM - Timeout protege
const data = await fetch(url, { signal: AbortController.timeout(10000) });
```

### 6.2 Sempre Limpe Recursos

```typescript
// ✅ Sempre limpa timers, conexões, etc.
const controller = new AbortController();
try {
  const res = await fetch(url, { signal: controller.signal });
  // ...
} finally {
  controller.abort();  // Limpa
}
```

### 6.3 Não Engula Erros

```typescript
// ❌ RUIM - Erro silencioso
try {
  await riskyOperation();
} catch (err) {
  // Nada :(
}

// ✅ BOM - Log ou propaga
try {
  await riskyOperation();
} catch (err) {
  console.error("Operação falhou:", err);
  throw err;  // Propaga para chamador
}
```

---

## 7. Exercícios

### Exercício 1: Implemente Retry Decorator

```typescript
function retry<T>(
  fn: () => Promise<T>,
  options: { retries: number; backoffMs: number }
): Promise<T> {
  // Implementa lógica de retry
}
```

### Exercício 2: Implemente Circuit Breaker

```typescript
class CircuitBreaker {
  // Implementa circuit breaker completo
}
```

---

## 8. Resumo

- **Erros são inevitáveis** - prepare-se
- **Retry com backoff** - tenta novamente com espera crescente
- **Timeout** - não espera para sempre
- **Rate limiting** - respeite limites da API
- **Token bucket** - algoritmo para rate limiting
- **Fallback** - alternativas se primário falha
- **Log estruturado** - registre erros com contexto

---

**Próximo Capítulo:** Estratégias de Teste

[Continue para o Capítulo 7](./07-testes.md)
