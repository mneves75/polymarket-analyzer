# Polymarket API Realtime Ingestion - Exec Spec

Date: 2026-01-06
Owner: (fill)
Status: Draft

## Contexto
Objetivo: destrinchar a API do Polymarket e implementar uma ingestao que capture o maximo de dados possivel, com latencia minima ("assim que acontecem"). Isso exige combinar fontes realtime (WebSocket) com backfill/polling (REST) e reconciliacao de estados.

## Objetivos
- Cobrir todas as fontes oficiais documentadas: CLOB WebSocket + CLOB REST, Gamma API, Data API, RTDS e subgraph on-chain.
- Latencia baixa para eventos de mercado (orderbook e last trade) via WebSocket.
- Consistencia de dados com reconciliacao (snapshot + stream) e reprocessamento.
- Observabilidade completa (lag, perdas, reconexao, qualidade).

## Nao-objetivos
- Execucao de trades em producao (apenas ingestao e analise).
- Trading/market making automatizado.
- UX/visualizacao final (fora do escopo deste spec).

## Fontes de dados oficiais (o que capturar)

### 1) CLOB WebSocket (realtime)
- Base: wss://ws-subscriptions-clob.polymarket.com/ws/
- Canais principais:
  - market: dados publicos de mercado, baixa latencia.
  - user: dados do usuario autenticado (orders/trades), se houver credenciais.
- Subscriptions:
  - market usa assets_ids (token IDs) e type=MARKET.
  - user usa markets (condition IDs) e type=USER.
  - custom_feature_enabled habilita eventos extra (ex: best_bid_ask, new_market).
  - Suportar subscribe/unsubscribe dinamico sem reconnect.
- Mensagens relevantes do market channel:
  - book: snapshot/updates de orderbook (bids/asks).
  - price_change: deltas incrementais de bids/asks (schema novo desde 2025-09-15).
  - last_trade_price: ultimo preco negociado (evento de trade).
  - tick_size_change: mudanca de tick quando preco passa 0.04 ou 0.96.
  - best_bid_ask: melhor bid/ask quando custom_feature_enabled.
  - new_market: novo mercado (custom_feature_enabled).
- Opcional: initial_dump=true (default) para snapshot inicial via WS.
- Nota: docs mostram inconsistencias de keys (buys/sells vs bids/asks). Parser deve aceitar ambos.
- User channel inclui eventos de trade com mudancas de status (MATCHED, MINED, CONFIRMED, RETRYING, FAILED).
- Boas praticas recomendam: manter orderbook local, responder heartbeats e detectar gaps.

### 2) CLOB REST (snapshot + backfill)
- Base: https://clob.polymarket.com
- Endpoints principais (publicos):
  - GET /book, POST /books (orderbook snapshot, batch)
  - GET /price, GET /prices, POST /prices (preco; batch com body)
  - GET /midpoint (mid price)
  - GET /prices-history (historico de precos; rate limits listam /price_history)
  - GET /data/trades (trades do usuario autenticado; requer L2 header)
- Usar para:
  - Snapshot inicial (se nao usar initial_dump no WS).
  - Resync quando detectar gaps/erros.
  - Backfill historico (prices-history).
  - Trades detalhados quando houver auth (user-scoped).

### 3) Gamma API (metadados de eventos/mercados)
- Base: https://gamma-api.polymarket.com
- Endpoints principais:
  - GET /events (recomendado para discovery com paginacao)
  - GET /markets
- Usar para:
  - Descoberta de mercados/eventos ativos.
  - Mapear market -> conditionId -> token/outcome/asset_id.
  - Atualizar metadados (titulo, categoria, timestamps, resolucao, etc).
- Pratica comum: /events com active=true, closed=false, order/id e paginacao por limit/offset.

### 4) Data API (dados agregados do usuario e mercado)
- Base: https://data-api.polymarket.com
- Endpoints principais:
  - GET /positions (posicoes atuais)
  - GET /activity (atividade on-chain)
  - GET /trades (historico de trades)
  - GET /closed-positions (posicoes fechadas)
  - GET /holders (top holders por market)
  - GET /value (valor total da carteira)
  - GET /v1/leaderboard (rankings de traders)
- Usar para:
  - Dados agregados de posicoes e atividades.
  - Top holders, leaderboard, e metricas que nao vem no CLOB WS.
  - Polling com intervalos maiores (nao realtime).
- Paginacao: respeitar limit/offset e preferir janelas de tempo para backfill.
- Desde 2025-08-26, /trades e /activity tem limites mais baixos (limit <= 500, offset <= 1000).
- Limites por endpoint (docs):
  - /positions: limit <= 500, offset <= 10000
  - /activity: limit <= 500, offset <= 10000 (changelog reduz offset para 1000)
  - /trades: limit/offset ate 10000 (changelog reduz para 500/1000)
  - /closed-positions: limit <= 50, offset <= 100000
  - /holders: limit <= 20
  - /v1/leaderboard: limit <= 50, offset <= 1000

### 5) RTDS WebSocket (comentarios e crypto)
- Base: wss://ws-live-data.polymarket.com
- Mensagens conhecidas:
  - Precos de crypto.
  - Comentarios de mercado (comment_created, comment_removed, reaction_created, reaction_removed).
- Usar quando necessario para enriquecer contexto (comments e referencias de preco).
- Crypto prices sao derivados de feeds (ex: Binance + Chainlink).
- Manter ping/pong periodico (ex: 5s) e suportar subscribe/unsubscribe dinamico.

### 6) On-chain / Subgraph
- Usar para reconciliar resolucoes e fatos on-chain, quando precisar garantir finalizacao.
- Fonte sugerida nas docs do Polymarket como "Additional Data Sources".

## Arquitetura proposta

### Visao geral
- Market Discovery Service (Gamma): gera lista de mercados e asset_ids.
- Realtime Streamer (CLOB WS): assina market channel por asset_ids; emite eventos normalizados.
- Snapshot/Backfill Service (CLOB REST + Data API): snapshots e historico.
- RTDS Listener (opcional): comments e cryptoprice.
- Normalizador: padroniza schemas e ids.
- Storage:
  - Relacional (Postgres) para metadados e referencia.
  - Time-series (ClickHouse/Timescale) para ticks e orderbook updates.
  - Object store (S3) para raw event logs.
- Event bus (Kafka/Redpanda) para ingestao e processamento desacoplado.

### Identificadores e relacionamento
- event_id (Gamma /events)
- market_id e condition_id (Gamma /markets)
- asset_id (CLOB token/outcome; derivado de clobTokenIds/outcomes)
- trade_id (CLOB trades)
- user_id (Data API, quando aplicavel)

### Fluxo realtime (market data)
1) Poll Gamma /events e /markets para descobrir/atualizar mercados.
2) Extrair asset_ids de cada market.
3) Conectar WS no market channel e assinar por asset_ids.
4) Se initial_dump=true, gerar snapshot inicial de orderbook via WS; senao, usar CLOB REST /book(s).
5) Processar updates:
   - price_change -> aplica deltas no orderbook.
   - book -> substitui snapshot quando enviado.
   - last_trade_price -> gera evento de trade simplificado; depois complementa via Data API /trades (poll curto) ou via CLOB /data/trades se tiver auth.
6) Reconciliar periodicamente com /book(s) e /prices-history para garantir consistencia.

### Fluxo de dados agregados
- Data API: polling intervalado (ex: 1-5 min) para positions/activity/holders/value.
- Leaderboard: polling mais lento (ex: 5-30 min).
- RTDS: manter conexao e heartbeats; mapear comments para market_id.

### Confiabilidade e reconciliacao
- Detectar gaps: counters/sequence ou timestamps fora de ordem.
- Re-sync: snapshot completo + replay de eventos recentes.
- Idempotencia: chave composta (source, type, id, timestamp, hash) para dedupe.
- Monitorar hashes/sequence do orderbook quando expostos pelos feeds.

### Rate limits e throttling
- Respeitar limites oficiais por endpoint (CLOB, Gamma, Data API) e backoff.
- Limites sao com throttling (Cloudflare), nao rejeicao imediata.
- Implementar bucket de taxa por host e por endpoint.
- Data API: respeitar limites de paginacao (limit/offset) e ajustar backfill por janelas de tempo.
- Referencia rapida (por 10s):
  - CLOB geral: 9000
  - CLOB: /book 1500, /books 500, /price 1500, /prices 500, /midpoint 1500
  - CLOB: /price_history 1000, /data/trades 500
  - Gamma geral: 4000
  - Gamma: /events 500, /markets 300
  - Data API: geral 1000, /positions 150, /trades 200, /closed-positions 150

### Observabilidade
- Metricas: lag WS, msgs/s, drops, reconexoes, desyncs, latencia de processamento.
- Logs estruturados e trilha de reprocessamento.
- Alertas: atraso > Xs, reconexoes frequentes, falhas de backfill.

## Multi-phase Engineering TODO

### Fase 0 - Descoberta e base tecnica
- Ler docs oficiais e confirmar endpoints/params em ambiente real.
- Definir o stack (linguagem, libs WS, DB, fila) e padroes de deploy.
- Definir schema de dados canonico e regras de normalizacao.
- Documentar requisitos de auth (L2 headers) para user channel.
- Validar path exato de midpoint e price_history/prices-history, alem de batch endpoints.

### Fase 1 - Foundation e armazenamento
- Criar repositorio de ingestao com config por ambiente.
- Implementar modelos e migracoes (market, event, token, orderbook, trade, activity, holder).
- Preparar storage de raw events (S3 ou filesystem).
- Setup de observabilidade (metrics + logs).

### Fase 2 - Gamma discovery
- Implementar crawler /events e /markets com paginacao.
- Mapear market -> asset_ids; manter lista ativa/encerrada.
- Delta sync (atualizar apenas mercados alterados).
- Persistir metadados e eventos.

### Fase 3 - CLOB WS realtime
- Conectar WS market channel com reconnect + backoff.
- Subscriptions por asset_ids, com sharding para limites de conexao (limite de tokens removido em 2025-09-15).
- Suportar price_change (schema novo) + book + last_trade_price + tick_size_change + best_bid_ask.
- Parser tolerante a buys/sells vs bids/asks.
- Aplicar deltas ao orderbook e publicar eventos normalizados.
- Persistir best_bid/best_ask e timestamps do price_change.
- Implementar heartbeat/keepalive e rotacao de conexoes.

### Fase 4 - CLOB REST snapshot/backfill
- Implementar /book(s) para snapshot inicial e resync.
- Implementar /price(s) e /midpoint para checks e baseline.
- Implementar /prices-history para historico.
- Implementar /data/trades para detalhes de trades (auth, user-scoped).
- Persistir novos campos do /book(s) (min_order_size, tick_size, neg_risk) quando presentes.
- Respeitar limite de ate 500 items por request nos endpoints batch (/books, /prices).
- Criar reconciliador periodic (snapshot vs stream).

### Fase 5 - Data API agregada
- Implementar polling /positions, /activity, /trades, /closed-positions.
- Implementar /holders, /value, /v1/leaderboard.
- Normalizar e persistir; linkar com market_id/asset_id.
- Definir janelas e estrategias de refresh (ex: diff por updated_at).
- Ajustar paginacao para limites de limit/offset (ex: limit <= 500, offset <= 1000).

### Fase 6 - RTDS (comentarios/crypto)
- Implementar WS rtds com subscribe/unsubscribe.
- Capturar comments por market_id e precos crypto.
- Integrar com pipeline e storage.

### Fase 7 - On-chain/subgraph
- Identificar subgraph(s) oficiais e queries minimas.
- Backfill de resolucao e reconciliacao final.
- Jobs diarios para garantir finalidade.

### Fase 8 - QA, resiliencia e operacao
- Testes de integracao com endpoints reais (safe rate).
- Testes de reconexao, perda e reorder de mensagens.
- Runbooks de incidentes e playbooks de resync.
- Load test de alta quantidade de asset_ids.

### Fase 9 - Validacao e entrega
- Validar qualidade (lag < alvo, consistencia vs REST).
- Documentar limites e custos.
- Checklist de deploy e monitoramento.

## Open questions
- Qual e o SLA de latencia desejado (ex: < 500ms vs < 2s)?
- Precisamos de dados privados (user channel) ou apenas publicos?
- Qual e a retention de raw events e historicos?
- Onde hospedar: cloud vs local?
- Precisamos de enriquecimento adicional (news, odds externas)?

## Referencias (para inserir no codebase)
- Endpoints base: https://docs.polymarket.com/quickstart/reference/endpoints
- CLOB WSS overview: https://docs.polymarket.com/developers/CLOB/websocket/wss-overview
- CLOB market channel: https://docs.polymarket.com/developers/CLOB/websocket/market-channel
- CLOB user channel: https://docs.polymarket.com/developers/CLOB/websocket/user-channel
- CLOB trades (auth): https://docs.polymarket.com/developers/CLOB/trades/get-trades
- CLOB orderbook /book: https://docs.polymarket.com/api-reference/orderbook/get-order-book-summary
- CLOB orderbook /books: https://docs.polymarket.com/api-reference/orderbook/get-multiple-order-books-summaries-by-request
- CLOB price /price: https://docs.polymarket.com/api-reference/pricing/get-market-price
- CLOB prices /prices: https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices
- CLOB prices /prices (batch): https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices-by-request
- CLOB midpoint /midpoint: https://docs.polymarket.com/api-reference/pricing/get-midpoint-price
- CLOB prices-history: https://docs.polymarket.com/api-reference/pricing/get-price-history-for-a-traded-token
- Gamma fetch markets guide: https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
- Data API positions: https://docs.polymarket.com/developers/misc-endpoints/data-api-get-positions
- Data API activity: https://docs.polymarket.com/developers/misc-endpoints/data-api-activity
- Data API trades: https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets
- Data API closed-positions: https://docs.polymarket.com/api-reference/core/get-closed-positions-for-a-user
- Data API holders: https://docs.polymarket.com/developers/misc-endpoints/data-api-holders
- Data API value: https://docs.polymarket.com/developers/misc-endpoints/data-api-value
- Data API leaderboard: https://docs.polymarket.com/api-reference/core/get-trader-leaderboard-rankings
- RTDS overview: https://docs.polymarket.com/developers/RTDS/RTDS-overview
- RTDS crypto prices: https://docs.polymarket.com/developers/RTDS/RTDS-crypto-prices
- RTDS comments: https://docs.polymarket.com/developers/RTDS/RTDS-comments
- Rate limits: https://docs.polymarket.com/quickstart/introduction/rate-limits
- Changelog: https://docs.polymarket.com/changelog
- Data feeds best practices: https://docs.polymarket.com/developers/market-makers/data-feeds
- Polymarket subgraph: https://docs.polymarket.com/developers/subgraph/overview
- CLOB WS migration guide: https://docs.polymarket.com/developers/CLOB/websocket/market-channel-migration-guide
