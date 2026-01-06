# Polymarket TUI Demo - Exec Spec

Date: 2026-01-06
Owner: (fill)
Status: Implemented

## Contexto
Objetivo: entregar um programa Bun + TypeScript com CLI + TUI que demonstre dados publicos do Polymarket em tempo quase real. O demo deve ser leve, visual, facil de rodar e tecnicamente correto com as melhores praticas atuais da API.

## Objetivos
- Demonstrar discovery (Gamma), market data (CLOB REST + WS), historico (prices-history) e holders (Data API).
- Exibir um dashboard TUI com radar de mercados, orderbook, melhor bid/ask, ultimo trade, historico e holders.
- Latencia baixa via WebSocket, com fallback em REST.
- Respeitar limites e boas praticas oficiais de rate limiting e paginacao.
- Codebase limpa, modular e simples de evoluir.

## Nao-objetivos
- Execucao de trades ou carteira on-chain.
- Autenticacao L2 e dados privados (user channel, positions privadas).
- Persistencia duravel (banco de dados).

## Requisitos funcionais
1) CLI
- `--tui` inicia dashboard (padrao).
- `--once` imprime snapshot JSON unico.
- `--list-markets` lista mercados ativos (radar).
- `--market <conditionId>` foca mercado por condition id.
- `--slug <slug>` resolve mercado/evento pelo slug (preferencia para market slug).
- `--interval <ms>` controla polling REST.
- `--no-ws` desabilita WebSocket.

2) TUI (layout)
- Topo: titulo, relogio, status WS.
- Radar (lista): top N mercados ativos com titulo + outcome 1.
- Market details: event/title/question, condition id, outcome selecionado, token id.
- Pulse: best bid/ask, spread, midpoint, ultimo trade, bias.
- Orderbook: top N levels (bids/asks).
- History: sparkline + ultimo valor.
- Holders: top holders (rank, address, shares).

3) Dados exibidos
- Gamma: events/markets para discovery e metadata.
- CLOB REST: /book, /price, /midpoint, /prices-history.
- CLOB WS: market channel (best_bid_ask, last_trade_price, price_change).
- Data API: /holders.

## Requisitos nao-funcionais
- Simplicidade: rodar com `bun install` + `bun run`.
- Resiliencia: reconectar WS, backoff, timeouts, mensagens fora de ordem.
- Confiabilidade: parse tolerante a schemas (price_change novo, buys/sells vs bids/asks).
- Observabilidade leve: log de erros e status no footer.
- UX resiliente: tratar 404 "no orderbook" como estado esperado (sem alertas ruidosos).

## Referencias oficiais (usar como fonte de verdade)
- Gamma discovery best practices (use /events com paginacao, closed=false; slug para market individual). 
- CLOB market channel e migration guide (price_change schema novo).
- CLOB REST /book, /price, /midpoint, /prices-history.
- RTDS overview para ping/pong e dynamic subscriptions (se usado).
- Rate limits oficiais.

## Arquitetura proposta

### Modulos
- cli: parse args, help, dispatch
- api: clients REST (Gamma, CLOB, Data API)
- ws: client CLOB market channel
- tui: UI layout + rendering
- state: store em memoria (market selecionado, radar, orderbook, ticks)
- utils: formatadores, rate limiter, retry/backoff

### Fluxo de dados
1) Discovery (Gamma /events): atualiza radar.
2) Resolve foco (slug/condition id) e extrai clobTokenIds.
3) Inicia WS market channel com asset_ids do market focado (ou todos do radar em shard).
4) Poll REST para baseline (book/price/midpoint/history/holders).
5) WS alimenta pulse em tempo real (best bid/ask, last trade).

### Rate limiting e backoff
- Bucket por host e endpoint.
- Respeitar limites oficiais e usar jitter em backoff.
- Preferir dados de WS para reduzir chamadas REST frequentes.

### Resiliencia
- Reconexao WS com exponencial backoff e cooldown.
- Heartbeat: ping/pong quando aplicavel.
- Fallback REST quando WS indisponivel.
- Idempotencia: dedupe basico por timestamp e asset_id para pulse.

## Multi-phase Engineering TODO

### Fase 0 - Descoberta e verificacao
- Confirmar schemas atuais de Gamma, CLOB WS (price_change novo) e REST.
- Validar parametros de /prices-history (market, interval, fidelity).
- Validar rate limits atuais e limites de paginacao.
- Revisar se endpoints retornam array direto ou objeto com `data`/`events`.

### Fase 1 - Fundacao do CLI
- Definir CLI robusto (parse args com validacao e mensagens claras).
- Implementar `--help`, `--once`, `--list-markets`, `--market`, `--slug`, `--no-ws`.
- Adicionar `--json` para outputs de snapshot/lista.

### Fase 2 - Gamma discovery
- Implementar fetch /events com paginacao e closed=false.
- Normalizar market -> conditionId, clobTokenIds, outcomes.
- Cache em memoria com refresh configuravel.
- Resolver slug (market slug primeiro; fallback event slug).

### Fase 3 - CLOB REST baseline
- Implementar /book (orderbook), /price (bid/ask), /midpoint.
- Implementar /prices-history (interval + fidelity configuravel).
- Normalizar orderbook (bids/asks ou buys/sells).
- Guardar tick_size, min_order_size, neg_risk quando presentes.

### Fase 4 - CLOB WS realtime
- Conectar WSS market channel com custom_feature_enabled.
- Implementar parsing do price_change novo (price_changes[] com best_bid/best_ask por change).
- Suportar best_bid_ask e last_trade_price.
- Adicionar reconexao, backoff, status no UI.
- Opcional: manter orderbook local (aplicando price_changes) para evitar polling frequente.

### Fase 5 - Data API holders
- Implementar /holders com limit.
- Normalizar campos (shares, shares_value, value).
- Refresh mais lento (1-5 min).

### Fase 6 - TUI inovacao e UX
- Radar com indicador de spread/volatilidade (heat map simples).
- Painel de alerta para mercados com mudanca rapida (delta > threshold).
- Teclas: n/p para navegar, o para outcome, r para refresh, s para salvar snapshot.
- Estado visual para WS (connecting/ok/stale).

### Fase 7 - Observabilidade e logs
- Log estruturado simples (stderr) com erros e tempo de resposta.
- Indicador de staleness (ms desde ultimo update WS/REST).
- Estatisticas basicas de throughput (msgs/s).

### Fase 8 - QA e testes
- Testes unitarios de parsing (price_change novo, book, history).
- Mocks de WS com fixtures.
- Testes CLI (help, list, once) com snapshots.

### Fase 9 - Distribuicao
- Documentar setup e exemplos.
- Verificar `bin` e shebang para execucao direta.
- Opcional: bundle com `bun build` para distribuicao.

## Criterios de aceite
- Dashboard abre em < 2s e mostra dados reais.
- WS reconecta automaticamente em falhas de rede.
- Dados de WS refletem os schemas atuais.
- CLI snapshot funciona e gera JSON valido.
- Respeito a rate limits sem erros 429.

## Status de execucao (concluido)
- Fase 0: validacao de schemas e parametros (precos-history, midpoint) sem fallback /midprice.
- Fase 1: CLI com validacao de args e modo JSON.
- Fase 2: discovery Gamma com parsing resiliente e outcomes default.
- Fase 3: baseline REST com timeout, normalizacao e campos adicionais.
- Fase 4: WS com price_change novo, reconexao/backoff, stale detection.
- Fase 5: holders via Data API com parsing robusto.
- Fase 6: TUI com radar heat, alertas, filtro e snapshot.
- Fase 7: logs estruturados simples e indicadores de staleness/msg rate.
- Fase 8: testes unitarios + CLI smoke test.
- Fase 9: README e scripts de build/test.
- Best practices v2: WS ping/heartbeat handling, hash/sequence/timestamp usage, gap detection e resync.

## Open questions
- Precisamos suportar RTDS (comments/crypto) nesta demo?
- Profundidade maxima do orderbook no TUI?
- Devemos priorizar performance (menos chamadas REST) ou fidelidade (mais polling)?
- Precisamos persistir snapshots em disco?
