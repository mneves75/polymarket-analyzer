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

## 8. ✅ Checkpoint

**Teste seu conhecimento antes de continuar:**

1. **Qual é a diferença entre retry com backoff fixo e backoff exponencial?**
   - a) Fixo espera sempre o mesmo tempo, exponencial dobra a cada tentativa
   - b) Fixo dobra a cada tentativa, exponencial espera sempre o mesmo tempo
   - c) Não há diferença

   <details>
   <summary>Resposta</summary>
   **a)** Backoff fixo: 100ms, 100ms, 100ms... | Backoff exponencial: 100ms, 200ms, 400ms, 800ms...
   </details>

2. **O que é jitter e por que é importante?**
   - a) Um tipo de erro que acontece aleatoriamente
   - b) Uma variação aleatória adicionada ao tempo de espera para evitar sincronização
   - c) Uma métrica de performance

   <details>
   <summary>Resposta</summary>
   **b)** Jitter é uma variação aleatória adicionada ao backoff para evitar que múltiplos clientes sincronizem seus retries. Sem jitter, se 10 clientes falharem ao mesmo tempo, todos tentarão novamente ao mesmo tempo, criando uma "tempestade" de requisições.
   </details>

3. **Como funciona o algoritmo Token Bucket para rate limiting?**
   - a) Cria um token para cada requisição e descarta após uso
   - b) Mantém um balde com tokens que é reabastecido periodicamente; cada requisição consome um token
   - c) Limita o número total de requisições por dia

   <details>
   <summary>Resposta</summary>
   **b)** Token Bucket: Balde é preenchido com N tokens no início de cada janela (ex: 1500 tokens a cada 10s). Cada requisição consome 1 token. Se balde vazio, aguarda até reabastecimento. Isso permite bursts dentro do limite mas previne uso contínuo excessivo.
   </details>

4. **Quando você deve implementar timeout em uma requisição HTTP?**
   - a) Sempre, em todas as requisições
   - b) Apenas em requisições externas
   - c) Nunca, deixa o sistema tratar naturalmente

   <details>
   <summary>Resposta</summary>
   **a)** Sempre implemente timeout. Sem timeout, sua aplicação pode travar indefinidamente esperando uma resposta que nunca virá. Um valor comum é 5-10 segundos para APIs externas.
   </details>

5. **Qual é a diferença entre Circuit Breaker e Retry?**
   - a) Retry tenta novamente imediatamente, Circuit Breaker para de tentar temporariamente
   - b) Circuit Breaker tenta novamente, Retry para
   - c) São a mesma coisa

   <details>
   <summary>Resposta</summary>
   **a)** Retry: Tenta novamente após falha (com backoff). Circuit Breaker: Após X falhas consecutivas, para de tentar por Y segundos (estado "aberto") para não sobrecarregar um serviço que já está falhando.
   </details>

**Parabéns!** Se você respondeu corretamente, está pronto para o próximo capítulo.

---

## 9. ⚠️ Common Pitfalls

### Pitfall 1: "Engolir" Erros (Silent Failures)

**Problem:** Capturar erros mas não tratá-los adequadamente.

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
  logger.error("Operação falhou", err);
  throw err;  // Propaga para chamador
}

// ✅ MELHOR - Tratamento específico
try {
  await riskyOperation();
} catch (err) {
  if (err instanceof NetworkError) {
    return fallbackData;  // Usa fallback
  }
  throw err;  // Outros erros propagam
}
```

**Why it's bad:** Erros silenciosos são impossíveis de debugar. Você nunca saberá que algo falhou.

---

### Pitfall 2: Retry Infinito

**Problem:** Retry sem limite máximo causa loop infinito.

```typescript
// ❌ RUIM - Nunca desiste
while (true) {
  try {
    return await fetch(url);
  } catch {
    // Tenta para sempre!
  }
}

// ✅ BOM - Limita tentativas
let attempts = 0;
const MAX_RETRIES = 3;
while (attempts < MAX_RETRIES) {
  try {
    return await fetch(url);
  } catch {
    attempts++;
    if (attempts >= MAX_RETRIES) throw;
    await backoff(attempts);
  }
}
```

---

### Pitfall 3: Backoff Sem Jitter

**Problem:** Múltiplos clientes sincronizam retries causando "thundering herd".

```typescript
// ❌ RUIM - Todos sincronizados
function backoff(attempt: number) {
  const delay = 200 * Math.pow(2, attempt);
  setTimeout(resolve, delay);  // Previsível!
}

// ✅ BOM - Com jitter aleatório
function backoff(attempt: number) {
  const base = 200 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 100);  // Aleatório
  setTimeout(resolve, base + jitter);
}
```

**Timeline de exemplo SEM jitter:**
```
Cliente A: falha → 200ms → 400ms → 800ms
Cliente B: falha → 200ms → 400ms → 800ms
Cliente C: falha → 200ms → 400ms → 800ms
Resultado: Tempestade sincronizada no servidor!
```

**Timeline COM jitter:**
```
Cliente A: falha → 234ms → 412ms → 878ms
Cliente B: falha → 189ms → 456ms → 801ms
Cliente C: falha → 267ms → 389ms → 845ms
Resultado: Requisições distribuídas, servidor aliviado!
```

---

### Pitfall 4: Ignorar Rate Limits

**Problem:** Assumir que API não tem rate limit.

```typescript
// ❌ RUIM - Sem rate limiting
async function fetchMany(urls: string[]) {
  return Promise.all(urls.map(url => fetch(url)));
  // 100 requisições simultâneas → API bloqueia!
}

// ✅ BOM - Com rate limiting
async function fetchMany(urls: string[]) {
  const results = [];
  for (const url of urls) {
    await rateLimiter.take({ key: url, limit: 10, windowMs: 1000 });
    results.push(await fetch(url));
  }
  return results;
}
```

---

### Pitfall 5: Timeout Muito Longo

**Problem:** Timeout de 60 segundos congela a aplicação.

```typescript
// ❌ RUIM - Timeout muito longo
const data = await fetch(url, { timeout: 60000 });
// Usuário espera 1 minuto sem resposta!

// ✅ BOM - Timeout curto com retry
const data = await fetchJson(url, {
  timeoutMs: 5000,   // 5 segundos
  retries: 3         // Tenta até 3 vezes = 15s total max
});
```

**Regra geral:** Timeout deve ser curto (5-10s) com múltiplos retries em vez de timeout longo sem retry.

---

### Pitfall 6: Não Logar Contexto

**Problem:** Logs sem contexto tornam debugging impossível.

```typescript
// ❌ RUIM - Sem contexto
console.error("Error:", err);
// Saída: Error: undefined

// ✅ BOM - Com contexto rico
logger.error("Falha ao buscar mercado", err, {
  endpoint: "/markets",
  tokenId: "0x123...",
  attempt: 3,
  timeoutMs: 5000,
  url: "https://gamma-api.polymarket.com/markets?limit=10"
});
// Saída: {"level":"error","message":"Falha ao buscar mercado","context":{...}}
```

---

### Pitfall 7: Exponential Backoff Errado

**Problem:** Cresce muito rápido (2^10 = 1024x) ou sem cap.

```typescript
// ❌ RUIM - Sem limite máximo
async function backoff(attempt: number) {
  const delay = 200 * Math.pow(2, attempt);
  // attempt=1: 200ms
  // attempt=10: 204,800ms = 3.4 minutos!
  // attempt=20: 209,715,200ms = 58 horas!
}

// ✅ BOM - Com teto máximo
async function backoff(attempt: number) {
  const base = 200 * Math.pow(2, attempt);
  const capped = Math.min(base, 30000);  // Máximo 30s
  const jitter = Math.floor(Math.random() * 100);
  await sleep(capped + jitter);
}
```

---

## 10. 🔧 Troubleshooting

### Issue: "Too Many Requests" (429) Mesmo com Rate Limiting

**Symptoms:**
```
HttpError: 429 Too Many Requests
```

**Diagnosis:**
1. Rate limit configurado incorretamente
2. Múltiplas instâncias rodando simultaneamente
3. Limite da API mudou

**Solutions:**

```typescript
// 1. Verifique configuração de rate limit
console.log("Rate limits:", RATE_LIMITS);
// Confirme que os limites estão corretos

// 2. Adicione monitoramento
const limiter = new RateLimiter();
limiter.on("wait", (waitTime) => {
  logger.warn("Rate limit atingido", { waitTime, key });
});

// 3. Verifique se não há múltiplas instâncias
// Linux/Mac:
ps aux | grep node

// 4. Adicione backoff agressivo quando receber 429
if (res.status === 429) {
  const retryAfter = res.headers.get("Retry-After");
  const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
  await sleep(waitMs);
}
```

---

### Issue: Requisições Ficam Presas

**Symptoms:**
- Aplicação trava
- Nenhuma resposta por minutos
- CPU em 0%

**Diagnosis:**
Timeout não implementado ou muito longo.

**Solution:**

```typescript
// 1. Sempre use timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const res = await fetch(url, { signal: controller.signal });
} catch (err) {
  if (err.name === "AbortError") {
    throw new Error("Timeout após 10 segundos");
  }
  throw err;
} finally {
  clearTimeout(timeout);
}

// 2. Adicione timeout a TODO fetch
// Use AbortController.timeout() (Node.js 18+)
const res = await fetch(url, {
  signal: AbortController.timeout(10000)
});
```

---

### Issue: Reconnect Loop Infinito

**Symptoms:**
- WebSocket conecta e desconecta constantemente
- Mensagens de "reconnecting" aparecem continuamente

**Diagnosis:**
1. URL incorreta
2. Protocolo não suportado
3. Autenticação faltando
4. Server rejeitando conexão

**Solution:**

```typescript
// 1. Adicione máximo de retries
const MAX_RECONNECT_ATTEMPTS = 10;
let reconnectAttempts = 0;

ws.addEventListener("close", () => {
  reconnectAttempts++;
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    logger.error("Max reconnect attempts reached");
    ws = null;
    return;  // Desiste
  }
  scheduleReconnect();
});

// 2. Adicione backoff crescente
function scheduleReconnect() {
  const delay = Math.min(
    30000,  // Máximo 30s
    500 * Math.pow(2, reconnectAttempts - 1)  // Exponential
  );
  logger.info(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  setTimeout(connect, delay);
}

// 3. Verifique URL
console.log("WS URL:", CONFIG.clobWsBase);
// Deve ser wss:// não https://
```

---

### Issue: Memory Leak com Timers

**Symptoms:**
- Uso de memória cresce continuamente
- Aplicação fica mais lenta com o tempo

**Diagnosis:**
Timers nunca sendo limpos.

**Solution:**

```typescript
// 1. Sempre guarde referências a timers
const timers: ReturnType<typeof setInterval>[] = [];

// 2. Limpe todos os timers ao sair
function cleanup() {
  timers.forEach(t => clearInterval(t));
  timers.length = 0;  // Limpa array
}

process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);

// 3. Use clearInterval após timer único
const timeout = setTimeout(() => {
  doSomethingOnce();
}, 5000);
// Não precisa limpar se é one-shot

// 4. Para intervalos, SEMPRE limpe
const interval = setInterval(() => {
  doSomethingRepeatedly();
}, 1000);
timers.push(interval);  // Guarda para cleanup posterior
```

---

### Issue: Error Messages Genéricos

**Symptoms:**
- "Error: undefined"
- "Error: Request failed"
- Sem informação útil

**Diagnosis:**
Erro original perdido ou não capturado.

**Solution:**

```typescript
// ❌ RUIM
try {
  await fetch(url);
} catch (err) {
  throw new Error("Request failed");  // Informação perdida!
}

// ✅ BOM - Preserva erro original
try {
  await fetch(url);
} catch (err) {
  throw new Error(`Request failed: ${err.message}`, { cause: err });
}

// ✅ MELHOR - Adiciona contexto
try {
  await fetch(url);
} catch (err) {
  const context = {
    url,
    method: "GET",
    timeout: 5000,
    attempt: 2
  };
  throw new Error(
    `Request to ${url} failed: ${err.message}`,
    { cause: err, context }
  );
}
```

---

### Issue: Fallback Não Funciona

**Symptoms:**
- Fallback nunca é usado mesmo quando primário falha
- Erro continua mesmo com fallback implementado

**Diagnosis:**
Erro propagando antes do fallback.

**Solution:**

```typescript
// ❌ RUIM - Erro propaga antes do fallback
async function getDataWithFallback() {
  try {
    return await getPrimaryData();
  } catch {
    return await getFallbackData();  // Nunca chega aqui
  }
}

// Problema: getPrimaryData tem try/catch interno que lança novo erro

// ✅ BOM - Primário não engole erro
async function getPrimaryData() {
  // Sem try/catch - deixa erro propagar
  return await fetch(primaryUrl);
}

// ✅ BOM - Ou loga e re-lança
async function getPrimaryData() {
  try {
    return await fetch(primaryUrl);
  } catch (err) {
    logger.warn("Primary failed, trying fallback", { error: err.message });
    throw err;  // Re-lança para chamador
  }
}

async function getDataWithFallback() {
  try {
    return await getPrimaryData();
  } catch {
    logger.info("Using fallback data source");
    return await getFallbackData();
  }
}
```

---

## 11. 🎓 Design Decisions

### Decisão 1: Por que Exponential Backoff com Jitter?

**Alternativas:**

| Estratégia | Vantagens | Desvantagens |
|-----------|-----------|--------------|
| **Fixed backoff** (100ms, 100ms, 100ms...) | Simples | Sincroniza clientes |
| **Linear backoff** (100ms, 200ms, 300ms...) | Previsível | Ainda pode sincronizar |
| **Exponential sem jitter** (100ms, 200ms, 400ms...) | Cresce rápido | **Sincroniza clientes!** |
| **Exponential COM jitter** ✅ | Cresce rápido + distribui | Mais complexo |

**Por que Exponential + Jitter foi escolhido:**

1. ✅ **Crescimento rápido:** Dobra a cada tentativa (100ms → 200ms → 400ms → 800ms...)
2. ✅ **Previne sincronização:** Jitter aleatório distribui retries no tempo
3. ✅ **Balanceia cargas:** Clientes não tentam todos ao mesmo tempo
4. ✅ **Recuperação graceful:** Server tempo para se recuperar

**Timeline visual:**
```
Servidor falha no t=0
├─ Cliente A: retry em 234ms, 445ms, 878ms
├─ Cliente B: retry em 189ms, 412ms, 801ms
├─ Cliente C: retry em 267ms, 389ms, 845ms
└─ Resultado: Requisições distribuídas, server não sobrecarregado
```

**Fórmula implementada:**
```typescript
// src/http.ts:124-127
async function backoff(attempt: number) {
  const base = 200 * Math.pow(2, attempt - 1);  // Exponential
  const jitter = Math.floor(Math.random() * 100);  // 0-100ms random
  await new Promise((resolve) => setTimeout(resolve, base + jitter));
}
```

**Por que 200ms base?**
- 200ms é perceptível para usuário mas não irritante
- 200ms → 400ms → 800ms → 1600ms → 3200ms
- 5 tentativas = ~6 segundos total (razoável)

**Por que 0-100ms jitter?**
- Pequeno o suficiente para não adicionar muito delay
- Grande o suficiente para distribuir retries
- 100ms é ~50% do base (200ms), bom equilíbrio

---

### Decisão 2: Por que Token Bucket em vez de outros algoritmos?

**Alternativas:**

1. **Fixed Window** - X requisições por Y segundos ❌
2. **Sliding Window Log** - Log de timestamps ❌
3. **Leaky Bucket** - Drip rate constante ❌
4. **Token Bucket** ✅

**Comparação:**

| Critério | Fixed Window | Sliding Log | Leaky Bucket | **Token Bucket** |
|----------|--------------|-------------|--------------|------------------|
| **Simplicidade** | ✅ Simples | ❌ Complexo | ⚠️ Médio | ✅ Simples |
| **Burst support** | ❌ Não | ✅ Sim | ❌ Não | ✅ Sim |
| **Memory usage** | ✅ Baixo | ❌ Alto (log) | ✅ Baixo | ✅ Baixo |
| **Precisão** | ❌ Bordas bugam | ✅ Preciso | ✅ Preciso | ✅ Preciso |
| **Smoothness** | ❌ Spiky | ✅ Suave | ✅ Suave | ✅ Suave |

**Por que Fixed Window é ruim:**
```
Janela de 10s, limite de 100 req:

t=0s:   100 req (OK)
t=0.1s: 100 req (OK!)  ← PROBLEMA: 200 req em 0.1s!
t=9.9s: 0 req
t=10s:  100 req (nova janela) ← PROBLEMA: 200 req em 0.1s!
```

**Por que Token Bucket é bom:**
```
Balde com 100 tokens, reabastece a 10 tokens/s:

t=0s:   Usa 100 tokens → balde vazio, aguarda
t=1s:   Ganha 10 tokens → pode fazer 10 req
t=2s:   Ganha 10 tokens → pode fazer 10 req
...
Resultado: Rate limit suave, sem spikes
```

**Implementação do projeto:**
```typescript
// src/rateLimiter.ts:15-33
async take(rule: RateLimitRule): Promise<void> {
  const now = Date.now();
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

  // Balde vazio → aguarda reset com jitter
  const waitMs = Math.max(0, bucket.resetAt - now) + jitter(20, 120);
  await sleep(waitMs);
  return this.take(rule);  // Recursão após espera
}
```

**Por que jitter de 20-120ms no rate limiter?**
- Previne que múltiplas threads aguardem exatamente o mesmo tempo
- 20ms mínimo = overhead pequeno
- 120ms máximo = aceitável para rate limit

---

### Decisão 3: Retry em quais códigos de status HTTP?

**Política do projeto:**

| Status | Retry? | Razão |
|--------|--------|-------|
| **2xx (Success)** | ❌ Não | Sucesso, não precisa retry |
| **3xx (Redirect)** | ⚠️ Depende | fetch segue automaticamente |
| **429 (Rate Limit)** | ✅ Sim | Limite temporário, vai passar |
| **4xx (Client Error)** | ❌ Não | Erro do cliente, retry não ajuda |
| **5xx (Server Error)** | ✅ Sim | Server pode se recuperar |

**Código implementado:**
```typescript
// src/http.ts:130-132
function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}
```

**Por que NÃO retry em 4xx (exceto 429):**
- **400 Bad Request:** Requisição malformada, retry não vai corrigir
- **401 Unauthorized:** Falta autenticação, precisa de token novo
- **403 Forbidden:** Sem permissão, retry não vai dar permissão
- **404 Not Found:** Recurso não existe, retry não vai criar
- **422 Unprocessable Entity:** Dados inválidos, retry não vai corrigir

**Por que SIM retry em 429 e 5xx:**
- **429 Too Many Requests:** Rate limit temporário, espere e tente de novo
- **500 Internal Server Error:** Erro temporário do server
- **502 Bad Gateway:** Server upstream pode estar se recuperando
- **503 Service Unavailable:** Server pode voltar em breve
- **504 Gateway Timeout:** Request pode funcionar em nova tentativa

---

### Decisão 4: Fallback ou Error-Fast?

**Filosofia do projeto:** Graceful Degradation com Error-Fast para críticos.

**O que usar fallback:**
```typescript
// ✅ Dados não-críticos com fallback
async function getMarketExtendedInfo(marketId: string) {
  try {
    return await fetchExtendedInfo(marketId);
  } catch {
    logger.warn("Extended info unavailable, using basic");
    return await fetchBasicInfo(marketId);  // Fallback
  }
}
```

**O que NÃO usar fallback:**
```typescript
// ❌ Dados críticos sem fallback = falha
async function executeTrade(marketId: string, amount: number) {
  try {
    return await placeOrder(marketId, amount);
  } catch {
    // NÃO pode retornar falso ou dados fake!
    throw err;  // Deve falhar explicitamente
  }
}
```

**Regra de ouro:**
- **Critical path:** Deixe falhar (fail-fast)
- **Nice-to-have:** Use fallback (graceful degradation)
- **UI display:** Use defaults se dados extras falharem

---

## 12. 📚 Para Saber Mais

### Artigos sobre Retry e Backoff

- **Exponential Backoff and Jitter**: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- **Retry Strategies in Distributed Systems**: https://blog.fauna.com/retry-strategies-distributed-systems/
- **Google's "Handling Errors" Guide**: https://cloud.google.com/architecture/error-handling-strategies

### Rate Limiting

- **Rate Limiting Algorithms Compared**: https://konghq.com/blog/rate-limiting-algorithms/
- **Token Bucket explained**: https://en.wikipedia.org/wiki/Token_bucket
- **Rate Limiting at Scale**: https://medium.com/@saisathishkumar/rate-limiting-at-scale-bddc1db14cc8

### Circuit Breaker

- **Circuit Breaker Pattern**: https://martinfowler.com/bliki/CircuitBreaker.html
- **Implementing Circuit Breaker**: https://medium.com/@ngd1214/circuit-breaker-pattern-5f749c3b0069

### Resilience Patterns

- **The Eight Fallacies of Distributed Computing**: https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing
- **Release It!** (Michael Nygard) - Livro sobre padrões de resiliência

### Documentação de APIs

- **Polymarket API Docs**: https://docs.polymarket.com
- **HTTP Status Codes**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

### Ferramentas

- **wscat** (WebSocket testing): `bun install -g wscat`
- **curl** (HTTP testing): `curl -v https://api.example.com`
- **hey** (Load testing): `bun install -g hey`

---

## 13. Resumo

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
