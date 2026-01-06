# Polymarket TUI - Alerts/404 Midpoint Hardening Exec Spec

Date: 2026-01-06
Owner: (fill)
Status: Implemented

## Contexto
O TUI ainda exibe alertas ruidosos quando o CLOB retorna HTTP 404 com a mensagem "No orderbook exists for the requested token id". Isso acontece para mercados iliquidos ou com orderbook ausente. O ruido aparece como `midpoint error: HTTP 404...` e mascara problemas reais. O fallback antigo de `/midprice` foi removido, mas ainda precisamos tratar esse 404 como condicao esperada, nao como erro.

## Objetivos
- Classificar erros do CLOB de forma estruturada (status + payload) e diferenciar 404 "no orderbook" de erros reais.
- Reduzir ruido em logs/alerts; exibir estado "sem orderbook" de forma clara e silenciosa.
- Evitar chamadas desnecessarias ao endpoint `/midpoint` quando ja sabemos que nao ha orderbook.
- Manter midpoint via best bid/ask quando possivel.

## Nao-objetivos
- Mudar a UX principal do TUI (layout geral).
- Implementar trading/autenticacao.
- Criar persistencia de dados.

## Requisitos funcionais
1) Erros HTTP estruturados
- `fetchJson` deve produzir um erro com `status`, `url` e `body` (JSON ou texto) quando `!res.ok`.
- Deve existir helper `isNoOrderbookError(err)` baseado em `status === 404` e mensagem/payload.

2) Politica de alertas
- Erros esperados (`no orderbook`) nao devem atualizar `lastAlert` nem gerar logs de erro.
- Erros reais devem continuar a registrar alerta + log.
- Ao recuperar, limpar `lastAlert` quando a condicao esperada deixar de existir.

3) Midpoint
- Se `/midpoint` falhar com `no orderbook`, definir `midpoint = midpointFrom(bestBid, bestAsk)` quando disponivel.
- Se `bestBid/bestAsk` ausentes e `no orderbook`, exibir `-` (sem alerta).

4) UI/Status
- Exibir estado "no orderbook" no painel de Market/Orderbook (por exemplo, badge/linha dedicada).
- Nao imprimir o erro raw no painel de Alerts & Status.

## Requisitos nao-funcionais
- Nao aumentar significativamente o volume de chamadas REST.
- Manter compatibilidade com o comportamento atual do WS.
- Manter logs concisos.

## Referencias
- CLOB REST `/midpoint` retorna 404 com payload JSON quando nao ha orderbook.
- Rate limiting atual permanece o mesmo.

## Arquitetura proposta

### Mudancas em HTTP layer
- Introduzir `HttpError` com campos:
  - `status: number`
  - `url: string`
  - `body: unknown` (json/text)
  - `message: string` (resumo curto)
- `fetchJson` passa a tentar `res.json()` e cai para `res.text()` quando JSON falhar.

### Mudancas em API layer
- `getMidpoint` retorna erro estruturado; sem fallback.
- `getOrderbook`/`getPrices` passam a reconhecer `no orderbook` e retornar `undefined`/`null` em vez de propagar erro (opcional, via flag).

### Mudancas em TUI
- Substituir checks de string por `isNoOrderbookError(err)`.
- `lastAlert` so atualiza para erros reais.
- Criar `lastNoOrderbookAt` e exibir status suave (muted) no painel.

## Multi-phase Engineering TODO

### Fase 0 - Diagnostico e reproducao
- [x] Reproduzir 404 com tokenId conhecido (via fetch direto ao `/midpoint`).
- [x] Capturar shape real do payload 404 (JSON vs HTML) e confirmar string da mensagem.
- [x] Mapear onde `lastAlert` fica preso mesmo apos sucesso.

### Fase 1 - HttpError estruturado
- [x] Criar classe `HttpError` em `src/http.ts`.
- [x] Atualizar `fetchJson` para lancar `HttpError` com status/url/body.
- [x] Adicionar helper `isNoOrderbookError(err: unknown)` em `src/http.ts` ou `src/parsers.ts`.
- [x] Atualizar chamadas para usar o novo helper.

### Fase 2 - API e estrategias de fallback
- [x] Garantir `getMidpoint` sem fallback e com tratamento de 404.
- [x] Opcional: evitar chamada de `/midpoint` se `getPrices` ou `getOrderbook` ja indicaram `no orderbook`.
- [x] Consolidar regra: midpoint preferencial via `/midpoint`; fallback via `(bestBid+bestAsk)/2`.

### Fase 3 - TUI: alertas e estado
- [x] Alterar atualizacao de `lastAlert` para nao mostrar `no orderbook`.
- [x] Limpar `lastAlert` quando estado voltar a normal.
- [x] Exibir estado `no orderbook` no painel Market/Orderbook (texto leve).
- [x] Evitar logError para 404 esperados.

### Fase 4 - Testes
- [x] Unit tests para `HttpError` e `isNoOrderbookError`.
- [x] Teste para midpoint fallback com `bestBid/bestAsk`.
- [x] Teste CLI snapshot para mercado sem orderbook (nao deve falhar nem alertar).

### Fase 5 - Documentacao
- [x] Atualizar `docs/plans/polymarket-tui-demo-exec-spec.md` (remover /midprice e registrar nova politica de alertas).
- [x] Atualizar README se existir secao de troubleshooting.

## Riscos
- Payloads 404 podem variar (HTML vs JSON). Mitigar com parsing robusto.
- Silenciar erros demais pode esconder problemas reais. Mitigar com `HttpError` estruturado e logs condicionalmente detalhados.

## Criterios de aceite
- Em mercados sem orderbook, o TUI nao mostra `midpoint error` nem spam de 404.
- Em mercados com orderbook, midpoint e best bid/ask continuam corretos.
- Logs nao perdem erros reais (ex.: 5xx, 429).
- Snapshot JSON continua valido mesmo quando orderbook ausente.

## Verificacao
- 2026-01-06: `/midpoint` com token sem orderbook retorna JSON `{\"error\":\"No orderbook exists for the requested token id\"}` (HTTP 404).
