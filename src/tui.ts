import blessed from "blessed";
import { CONFIG } from "./config";
import {
  getHolders,
  getMidpoint,
  getOrderbook,
  getPriceHistory,
  getPrices,
  type MarketInfo
} from "./api";
import { loadRadar, resolveMarket, type ResolveOptions } from "./market";
import { connectMarketWs } from "./ws";
import { asciiSparkline, formatNumber, formatPct, formatPrice, midpointFrom, padRight } from "./utils";
import {
  extractHistory,
  extractMidpoint,
  extractPrice,
  normalizeHolders,
  normalizeOrderbook,
  type OrderbookLevel,
  type OrderbookState
} from "./parsers";
import { mkdir, writeFile } from "node:fs/promises";
import { logError } from "./logger";
import { isNoOrderbookError } from "./http";

export type DashboardOptions = ResolveOptions & {
  intervalMs: number;
  ws: boolean;
};

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

export async function runDashboard(opts: DashboardOptions) {
  const screen = blessed.screen({
    smartCSR: true,
    title: "Polymarket Pulse"
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,
    style: { fg: THEME.headerFg, bg: THEME.headerBg }
  });

  const radarTable = blessed.box({
    top: 1,
    left: 0,
    width: "40%",
    height: "30%",
    border: "line",
    label: "Radar",
    tags: true,
    style: { fg: THEME.text, border: { fg: THEME.border }, label: { fg: THEME.label } }
  });

  const marketBox = blessed.box({
    top: 1,
    left: "40%",
    width: "60%",
    height: "30%",
    border: "line",
    label: "Market",
    tags: true,
    style: { fg: THEME.text, border: { fg: THEME.border }, label: { fg: THEME.label } }
  });

  const statsBox = blessed.box({
    top: "31%",
    left: 0,
    width: "40%",
    height: "20%",
    border: "line",
    label: "Pulse",
    tags: true,
    style: { fg: THEME.text, border: { fg: THEME.border }, label: { fg: THEME.label } }
  });

  const orderbookTable = blessed.box({
    top: "31%",
    left: "40%",
    width: "60%",
    height: "20%",
    border: "line",
    label: "Orderbook",
    tags: true,
    style: { fg: THEME.text, border: { fg: THEME.border }, label: { fg: THEME.label } }
  });

  const historyBox = blessed.box({
    top: "51%",
    left: 0,
    width: "40%",
    height: "20%",
    border: "line",
    label: "History",
    tags: true,
    style: { fg: THEME.text, border: { fg: THEME.border }, label: { fg: THEME.label } }
  });

  const holdersTable = blessed.box({
    top: "51%",
    left: "40%",
    width: "60%",
    height: "20%",
    border: "line",
    label: "Holders",
    tags: true,
    style: { fg: THEME.text, border: { fg: THEME.border }, label: { fg: THEME.label } }
  });

  const alertsBox = blessed.box({
    top: "71%",
    left: 0,
    width: "100%",
    height: "20%",
    border: "line",
    label: "Alerts & Status",
    tags: true,
    style: { fg: THEME.text, border: { fg: THEME.border }, label: { fg: THEME.label } }
  });

  const footer = blessed.box({
    bottom: 0,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,
    style: { fg: THEME.text, bg: "black" }
  });

  const filterPrompt = blessed.prompt({
    parent: screen,
    top: "center",
    left: "center",
    width: "60%",
    height: 7,
    border: "line",
    label: "Filter radar",
    tags: false,
    hidden: true
  });

  screen.append(header);
  screen.append(radarTable);
  screen.append(marketBox);
  screen.append(statsBox);
  screen.append(orderbookTable);
  screen.append(historyBox);
  screen.append(holdersTable);
  screen.append(alertsBox);
  screen.append(footer);

  radarTable.setContent(renderTable([[cell("#"), cell("Heat"), cell("Event"), cell("Outcome")]]));
  orderbookTable.setContent(renderTable([[cell("bid"), cell("size"), cell("ask"), cell("size")]]));
  holdersTable.setContent(renderTable([[cell("rank"), cell("address"), cell("shares")]]));

  let radar: MarketInfo[] = [];
  let outcomeIndex = 0;
  let focusMarket: MarketInfo | null = null;
  let orderbook: OrderbookState | null = null;
  const orderbookMap = new Map<string, OrderbookState>();
  let historySeries: number[] = [];
  let lastTrade: number | undefined;
  let lastTradePrev: number | undefined;
  let bestBid: number | undefined;
  let bestAsk: number | undefined;
  let midpoint: number | undefined;
  let noOrderbook = false;
  let lastNoOrderbookAt = 0;
  let wsStatus = "off";
  let wsConnection: { close: () => void } | null = null;
  let radarFilter = "";
  let lastWsAt = 0;
  let lastRestAt = 0;
  let lastHistoryAt = 0;
  let lastHoldersAt = 0;
  let lastReconcileAt = 0;
  let lastAlert = "";
  let msgCount = 0;
  let msgRate = 0;
  const lastHashByAsset = new Map<string, string>();
  const lastSeqByAsset = new Map<string, number>();
  const lastTsByAsset = new Map<string, number>();
  const resyncing = new Map<string, number>();

  async function refreshRadar() {
    try {
      radar = await loadRadar(opts.limit);
      lastRestAt = Date.now();
      if (!focusMarket) {
        focusMarket = await resolveMarket(opts, radar);
      } else {
        const match = radar.find((item) => item.conditionId === focusMarket?.conditionId);
        if (match) focusMarket = match;
      }
      render();
    } catch (err) {
      logError("Radar", err);
      footer.setContent(`Radar error: ${(err as Error).message}`);
      screen.render();
    }
  }

  async function refreshFocus(force = false) {
    if (!focusMarket) return;
    const tokenId = focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
    const now = Date.now();

    if (!force && isWsHealthy() && now - lastReconcileAt < CONFIG.reconcileMs) {
      if (bestBid !== undefined && bestAsk !== undefined) {
        midpoint = midpointFrom(bestBid, bestAsk) ?? midpoint;
      }
      return;
    }

    const shouldFetchMidpoint =
      force || !noOrderbook || now - lastNoOrderbookAt > CONFIG.noOrderbookCooldownMs;
    const midPromise = shouldFetchMidpoint ? getMidpoint(tokenId) : Promise.resolve(null);

    const [bookRes, pricesRes, midRes] = await Promise.allSettled([
      getOrderbook(tokenId, { allowNoOrderbook: true }),
      getPrices(tokenId, { allowNoOrderbook: true }),
      midPromise
    ]);

    let noOrderbookThisRefresh = false;

    if (bookRes.status === "fulfilled") {
      if (!bookRes.value) {
        noOrderbookThisRefresh = true;
        orderbook = null;
        orderbookMap.delete(tokenId);
      } else {
      const normalized = normalizeOrderbook(bookRes.value);
      orderbookMap.set(tokenId, normalized);
      orderbook = normalized;
      }
    } else {
      if (isNoOrderbookError(bookRes.reason)) {
        noOrderbookThisRefresh = true;
      } else {
        const message = (bookRes.reason as Error).message ?? String(bookRes.reason);
        logError("Orderbook", bookRes.reason);
        lastAlert = `orderbook error: ${message}`;
      }
    }

    if (pricesRes.status === "fulfilled") {
      if (!pricesRes.value) {
        noOrderbookThisRefresh = true;
        bestBid = undefined;
        bestAsk = undefined;
      } else {
        bestBid = extractPrice(pricesRes.value.buy);
        bestAsk = extractPrice(pricesRes.value.sell);
      }
    } else {
      if (isNoOrderbookError(pricesRes.reason)) {
        noOrderbookThisRefresh = true;
      } else {
        const message = (pricesRes.reason as Error).message ?? String(pricesRes.reason);
        logError("Prices", pricesRes.reason);
        lastAlert = `prices error: ${message}`;
      }
    }

    if (midRes.status === "fulfilled" && midRes.value) {
      midpoint = extractMidpoint(midRes.value);
    } else if (midRes.status === "rejected") {
      if (isNoOrderbookError(midRes.reason)) {
        noOrderbookThisRefresh = true;
      } else {
        const message = (midRes.reason as Error).message ?? String(midRes.reason);
        logError("Midpoint", midRes.reason);
        lastAlert = `midpoint error: ${message}`;
      }
      midpoint = midpointFrom(bestBid, bestAsk) ?? midpoint;
    } else {
      midpoint = midpointFrom(bestBid, bestAsk) ?? midpoint;
    }

    noOrderbook = noOrderbookThisRefresh;
    lastNoOrderbookAt = noOrderbook ? Date.now() : 0;
    if (!noOrderbook && lastAlert.toLowerCase().includes("no orderbook exists")) {
      lastAlert = "";
    }

    lastRestAt = Date.now();
    lastReconcileAt = Date.now();
    render();
  }

  async function refreshHistory() {
    if (!focusMarket) return;
    const tokenId = focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
    try {
      const history = await getPriceHistory(tokenId);
      historySeries = extractHistory(history);
      lastHistoryAt = Date.now();
      lastRestAt = Date.now();
      render();
    } catch (err) {
      logError("History", err);
      footer.setContent(`History error: ${(err as Error).message}`);
      screen.render();
    }
  }

  async function refreshHolders() {
    if (!focusMarket?.conditionId) return;
    try {
      const holders = await getHolders(focusMarket.conditionId, CONFIG.holdersLimit);
      renderHolders(holders);
      lastHoldersAt = Date.now();
      lastRestAt = Date.now();
    } catch (err) {
      logError("Holders", err);
      footer.setContent(`Holders error: ${(err as Error).message}`);
      screen.render();
    }
  }

  function swapOutcome(delta: number) {
    if (!focusMarket) return;
    outcomeIndex = (outcomeIndex + delta + focusMarket.clobTokenIds.length) % focusMarket.clobTokenIds.length;
    const tokenId = focusMarket.clobTokenIds[outcomeIndex];
    orderbook = orderbookMap.get(tokenId) ?? orderbook;
    refreshFocus();
    refreshHistory();
    render();
  }

  function render() {
    const now = Date.now();
    const wsAgeRaw = lastWsAt ? `${Math.round((now - lastWsAt) / 1000)}s` : "-";
    const restAgeRaw = lastRestAt ? `${Math.round((now - lastRestAt) / 1000)}s` : "-";
    const wsStale = lastWsAt ? now - lastWsAt > CONFIG.wsStaleMs : false;
    const restStale = lastRestAt ? now - lastRestAt > CONFIG.restStaleMs : false;
    const filterLabel = radarFilter ? `filter="${escapeTags(radarFilter)}"` : "filter=all";
    const wsLabel = colorText(escapeTags(wsStatus), statusColor(wsStatus, wsStale));
    const wsAge = colorText(wsAgeRaw, wsStale ? THEME.warning : THEME.muted);
    const restAge = colorText(restAgeRaw, restStale ? THEME.warning : THEME.muted);
    const msgRateLabel = colorText(String(msgRate), msgRate > 0 ? THEME.success : THEME.muted);
    header.setContent(
      ` Polymarket Pulse | ${new Date().toLocaleTimeString()} | ws=${wsLabel} (${wsAge}) | rest=${restAge} | ${filterLabel} | msg/s=${msgRateLabel} `
    );

    renderRadar();
    renderMarket();
    renderPulse();
    renderOrderbook();
    renderHistory();
    renderAlerts();
    footer.setContent(
      `${colorText("keys:", THEME.muted)} q=quit  n/p=next/prev  o=toggle outcome  r=refresh  f=/ filter  s=save `
    );

    screen.render();
  }

  function renderRadar() {
    const view = filterRadar(radar, radarFilter).slice(0, opts.limit);
    const rows = [[cell("#"), cell("Heat"), cell("Event"), cell("Outcome")]];
    view.forEach((market, idx) => {
      const isFocus = market.conditionId === focusMarket?.conditionId;
      const prefix = isFocus ? colorText(">", THEME.accent) : " ";
      rows.push([
        `${prefix}${String(idx + 1).padStart(2, "0")}`,
        heatSymbol(market),
        textCell(truncate(market.question || market.eventTitle || "(no title)", 30)),
        textCell(truncate(market.outcomes[0] || "-", 10))
      ]);
    });
    radarTable.setContent(renderTable(rows));
  }

  function renderMarket() {
    if (!focusMarket) {
      marketBox.setContent(colorText("No market selected", THEME.muted));
      return;
    }

    const tokenId = focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
    const outcome = focusMarket.outcomes[outcomeIndex] || `OUTCOME_${outcomeIndex + 1}`;

    const lines = [
      `${colorText("event:", THEME.muted)} ${textCell(focusMarket.eventTitle || "-")}`,
      `${colorText("question:", THEME.muted)} ${textCell(focusMarket.question || "-")}`,
      `${colorText("condition:", THEME.muted)} ${textCell(focusMarket.conditionId || "-")}`,
      `${colorText("outcome:", THEME.muted)} ${textCell(outcome)} ${colorText(`(${outcomeIndex + 1}/${focusMarket.clobTokenIds.length})`, THEME.muted)}`,
      `${colorText("token:", THEME.muted)} ${textCell(tokenId)}`
    ];

    if (noOrderbook) {
      const age = lastNoOrderbookAt ? `${Math.round((Date.now() - lastNoOrderbookAt) / 1000)}s` : "-";
      lines.push(`${colorText("orderbook:", THEME.muted)} ${colorText(`none (${age})`, THEME.muted)}`);
    }

    if (orderbook?.tickSize !== undefined) lines.push(`${colorText("tick:", THEME.muted)} ${orderbook.tickSize}`);
    if (orderbook?.minOrderSize !== undefined)
      lines.push(`${colorText("min order:", THEME.muted)} ${orderbook.minOrderSize}`);
    if (orderbook?.negRisk !== undefined)
      lines.push(`${colorText("neg risk:", THEME.muted)} ${String(orderbook.negRisk)}`);

    marketBox.setContent(lines.join("\n"));
  }

  function renderPulse() {
    const spread = bestBid !== undefined && bestAsk !== undefined ? bestAsk - bestBid : undefined;
    const bias = midpoint ?? lastTrade;
    const delta =
      lastTrade !== undefined && lastTradePrev !== undefined ? lastTrade - lastTradePrev : undefined;
    const deltaColor =
      delta === undefined ? THEME.muted : delta > 0 ? THEME.success : delta < 0 ? THEME.danger : THEME.muted;
    const spreadColor =
      spread === undefined ? THEME.muted : spread < 0.01 ? THEME.success : spread < 0.05 ? THEME.warning : THEME.danger;
    const bidColor = bestBid === undefined ? THEME.muted : THEME.success;
    const askColor = bestAsk === undefined ? THEME.muted : THEME.danger;
    const lines = [
      `${colorText("best bid :", THEME.muted)} ${colorText(formatPrice(bestBid), bidColor)}`,
      `${colorText("best ask :", THEME.muted)} ${colorText(formatPrice(bestAsk), askColor)}`,
      `${colorText("spread   :", THEME.muted)} ${colorText(formatPrice(spread), spreadColor)}`,
      `${colorText("midpoint :", THEME.muted)} ${colorText(formatPrice(midpoint), THEME.accent)}`,
      `${colorText("last     :", THEME.muted)} ${colorText(formatPrice(lastTrade), THEME.accent)}`,
      `${colorText("bias     :", THEME.muted)} ${colorText(formatPct(bias), THEME.accent)}`,
      `${colorText("delta    :", THEME.muted)} ${colorText(formatPrice(delta), deltaColor)}`
    ];
    statsBox.setContent(lines.join("\n"));
  }

  function renderOrderbook() {
    const rows = [[cell("bid"), cell("size"), cell("ask"), cell("size")]];
    const bids = orderbook?.bids ?? [];
    const asks = orderbook?.asks ?? [];
    const depth = CONFIG.orderbookDepth;

    for (let i = 0; i < depth; i += 1) {
      const bid = bids[i];
      const ask = asks[i];
      rows.push([
        cell(formatPrice(bid?.price)),
        cell(formatNumber(bid?.size)),
        cell(formatPrice(ask?.price)),
        cell(formatNumber(ask?.size))
      ]);
    }

    orderbookTable.setContent(renderTable(rows));
  }

  function renderHistory() {
    if (historySeries.length === 0) {
      historyBox.setContent(colorText("No history yet", THEME.muted));
      return;
    }
    const spark = asciiSparkline(historySeries, 40);
    historyBox.setContent(`${colorText(spark, THEME.accent)}\n${colorText("last=", THEME.muted)}${colorText(formatPrice(historySeries.at(-1)), THEME.accent)}`);
  }

  function renderAlerts() {
    const now = Date.now();
    const wsAge = lastWsAt ? Math.round((now - lastWsAt) / 1000) : null;
    const restAge = lastRestAt ? Math.round((now - lastRestAt) / 1000) : null;
    const historyAge = lastHistoryAt ? Math.round((now - lastHistoryAt) / 1000) : null;
    const holdersAge = lastHoldersAt ? Math.round((now - lastHoldersAt) / 1000) : null;
    const wsStale = wsAge !== null && wsAge * 1000 > CONFIG.wsStaleMs;
    const restStale = restAge !== null && restAge * 1000 > CONFIG.restStaleMs;

    const lines = [
      `${colorText("ws stale     :", THEME.muted)} ${colorText(wsStale ? "YES" : "no", wsStale ? THEME.danger : THEME.success)} ${colorText(`(${wsAge ?? "-"}s)`, THEME.muted)}`,
      `${colorText("rest stale   :", THEME.muted)} ${colorText(restStale ? "YES" : "no", restStale ? THEME.danger : THEME.success)} ${colorText(`(${restAge ?? "-"}s)`, THEME.muted)}`,
      `${colorText("history age  :", THEME.muted)} ${colorText(`${historyAge ?? "-"}s`, THEME.muted)}`,
      `${colorText("holders age  :", THEME.muted)} ${colorText(`${holdersAge ?? "-"}s`, THEME.muted)}`,
      `${colorText("last alert   :", THEME.muted)} ${colorText(escapeTags(lastAlert || "-"), lastAlert ? THEME.warning : THEME.muted)}`,
      `${colorText("msg/s        :", THEME.muted)} ${colorText(String(msgRate), msgRate > 0 ? THEME.success : THEME.muted)}`
    ];
    alertsBox.setContent(lines.join("\n"));
  }

  function renderHolders(data: Array<Record<string, unknown>> | Record<string, unknown>) {
    const holders = normalizeHolders(data);
    const rows = [[cell("rank"), cell("address"), cell("shares")]];
    holders.slice(0, CONFIG.holdersLimit).forEach((holder, idx) => {
      const address = String(holder.address || holder.trader || "-");
      const shares = Number(holder.shares || holder.shares_value || holder.value || 0);
      rows.push([
        cell(String(idx + 1)),
        cell(truncate(address, 16)),
        cell(formatNumber(shares))
      ]);
    });

    holdersTable.setContent(renderTable(rows));
  }

  function applyPriceChange(assetId: string, side: "BUY" | "SELL", price: number, size: number) {
    const current = orderbookMap.get(assetId) ?? { bids: [], asks: [] };
    const depthLimit = CONFIG.orderbookDepth * 5;
    const bids = side === "BUY" ? updateLevels(current.bids, price, size, true, depthLimit) : current.bids;
    const asks = side === "SELL" ? updateLevels(current.asks, price, size, false, depthLimit) : current.asks;
    const updated: OrderbookState = {
      bids,
      asks,
      minOrderSize: current.minOrderSize,
      tickSize: current.tickSize,
      negRisk: current.negRisk
    };
    orderbookMap.set(assetId, updated);
  }

  function isWsHealthy() {
    if (!opts.ws) return false;
    if (wsStatus !== "connected") return false;
    if (!lastWsAt) return false;
    return Date.now() - lastWsAt < CONFIG.wsStaleMs;
  }

  async function scheduleResync(assetId: string, reason: string) {
    const now = Date.now();
    const last = resyncing.get(assetId) ?? 0;
    if (now - last < CONFIG.resyncCooldownMs) return;
    resyncing.set(assetId, now);
    lastAlert = `resync ${reason}`;

    setTimeout(async () => {
      try {
        const book = await getOrderbook(assetId);
        const normalized = normalizeOrderbook(book);
        orderbookMap.set(assetId, normalized);
        if (assetId === focusMarket?.clobTokenIds[outcomeIndex]) {
          orderbook = normalized;
          render();
        }
      } catch (err) {
        logError("Resync", err);
        lastAlert = `resync failed: ${(err as Error).message ?? String(err)}`;
      }
    }, CONFIG.resyncDelayMs);
  }

  function checkAlert() {
    if (lastTrade === undefined || lastTradePrev === undefined) return;
    const delta = lastTrade - lastTradePrev;
    if (Math.abs(delta) >= CONFIG.alertDelta) {
      lastAlert = `${new Date().toLocaleTimeString()} delta=${delta.toFixed(4)} on ${
        focusMarket?.question || focusMarket?.eventTitle || "market"
      }`;
    }
  }

  async function saveSnapshot() {
    if (!focusMarket) return;
    const tokenId = focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
    const snapshot = {
      timestamp: new Date().toISOString(),
      market: focusMarket,
      tokenId,
      pulse: {
        bestBid,
        bestAsk,
        midpoint,
        lastTrade,
        wsStatus,
        lastWsAt,
        lastRestAt
      },
      orderbook,
      history: historySeries,
      holdersUpdatedAt: lastHoldersAt
    };

    await mkdir("snapshots", { recursive: true });
    const file = `snapshots/pm-${focusMarket.conditionId || "market"}-${Date.now()}.json`;
    await writeFile(file, JSON.stringify(snapshot, null, 2));
    footer.setContent(`Snapshot saved: ${file}`);
    screen.render();
  }

  function bindKeys() {
    screen.key(["q", "C-c"], () => {
      wsConnection?.close();
      process.exit(0);
    });

    screen.key(["n"], () => {
      const view = filterRadar(radar, radarFilter);
      if (view.length === 0) return;
      const currentIdx = view.findIndex((item) => item.conditionId === focusMarket?.conditionId);
      const nextIdx = (currentIdx + 1) % view.length;
      focusMarket = view[nextIdx];
      outcomeIndex = 0;
      restartWs();
      refreshFocus();
      refreshHistory();
      refreshHolders();
      render();
    });

    screen.key(["p"], () => {
      const view = filterRadar(radar, radarFilter);
      if (view.length === 0) return;
      const currentIdx = view.findIndex((item) => item.conditionId === focusMarket?.conditionId);
      const prevIdx = (currentIdx - 1 + view.length) % view.length;
      focusMarket = view[prevIdx];
      outcomeIndex = 0;
      restartWs();
      refreshFocus();
      refreshHistory();
      refreshHolders();
      render();
    });

    screen.key(["o"], () => swapOutcome(1));

    screen.key(["r"], () => {
      refreshRadar();
      refreshFocus(true);
      refreshHistory();
      refreshHolders();
    });

    screen.key(["f", "/"], () => {
      filterPrompt.input("Filter query:", radarFilter, (err, value) => {
        if (err) return;
        radarFilter = (value || "").trim();
        const view = filterRadar(radar, radarFilter);
        if (view.length > 0 && !view.some((item) => item.conditionId === focusMarket?.conditionId)) {
          focusMarket = view[0];
          outcomeIndex = 0;
          restartWs();
          refreshFocus();
          refreshHistory();
          refreshHolders();
        }
        render();
      });
    });

    screen.key(["s"], () => {
      saveSnapshot().catch((err) => {
        logError("Snapshot", err);
        footer.setContent(`Snapshot error: ${(err as Error).message}`);
        screen.render();
      });
    });
  }

  function restartWs() {
    if (!opts.ws) return;
    wsConnection?.close();
    wsStatus = "connecting";
    if (!focusMarket) return;

    wsConnection = connectMarketWs(focusMarket.clobTokenIds, {
      onStatus(status) {
        wsStatus = status;
        render();
      },
      onUpdate(update) {
        msgCount += 1;
        const updateTs = update.timestamp ?? update.ts;
        lastWsAt = updateTs;
        const prevTs = lastTsByAsset.get(update.assetId);
        const prevSeq = lastSeqByAsset.get(update.assetId);
        const prevHash = lastHashByAsset.get(update.assetId);

        if (update.hash && prevHash && update.hash === prevHash) {
          return;
        }
        if (update.sequence !== undefined && prevSeq !== undefined && update.sequence !== prevSeq + 1) {
          scheduleResync(update.assetId, `seq gap ${prevSeq}->${update.sequence}`);
        }
        if (updateTs && prevTs && updateTs < prevTs) {
          scheduleResync(update.assetId, "timestamp reorder");
        }
        if (update.hash) lastHashByAsset.set(update.assetId, update.hash);
        if (update.sequence !== undefined) lastSeqByAsset.set(update.assetId, update.sequence);
        if (updateTs) lastTsByAsset.set(update.assetId, updateTs);

        if (update.eventType === "price_change" && update.side && update.price !== undefined) {
          applyPriceChange(update.assetId, update.side, update.price, update.size ?? 0);
        }

        if (update.assetId === focusMarket?.clobTokenIds[outcomeIndex]) {
          if (update.lastTrade !== undefined) {
            lastTradePrev = lastTrade;
            lastTrade = update.lastTrade;
            checkAlert();
          }
          if (update.bestBid !== undefined) bestBid = update.bestBid;
          if (update.bestAsk !== undefined) bestAsk = update.bestAsk;
          if (update.bestBid !== undefined || update.bestAsk !== undefined) {
            midpoint = midpointFrom(bestBid, bestAsk) ?? midpoint;
          }

          const focusBook = orderbookMap.get(update.assetId);
          if (focusBook) orderbook = focusBook;
          render();
        }
      },
      onBook(assetId, book) {
        lastWsAt = Date.now();
        const normalized = normalizeOrderbook(book);
        orderbookMap.set(assetId, normalized);
        if (assetId === focusMarket?.clobTokenIds[outcomeIndex]) {
          orderbook = normalized;
          render();
        }
      }
    });
  }

  function startPolling() {
    setInterval(refreshRadar, CONFIG.radarMs);
    setInterval(refreshFocus, opts.intervalMs);
    setInterval(refreshHistory, CONFIG.historyMs);
    setInterval(refreshHolders, CONFIG.holdersMs);
    setInterval(() => {
      msgRate = msgCount;
      msgCount = 0;
      render();
    }, 1000);
  }

  bindKeys();
  await refreshRadar();
  await refreshFocus();
  await refreshHistory();
  await refreshHolders();
  if (opts.ws) restartWs();
  startPolling();
  render();
}

function filterRadar(list: MarketInfo[], query: string) {
  if (!query) return list;
  const q = query.toLowerCase();
  return list.filter((market) => {
    const hay = `${market.question || ""} ${market.eventTitle || ""} ${market.slug || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

function heatSymbol(market: MarketInfo) {
  const heat = computeHeat(market);
  const levels = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];
  const idx = Math.max(0, Math.min(levels.length - 1, Math.floor(heat * (levels.length - 1))));
  const color = heat > 0.7 ? THEME.danger : heat > 0.4 ? THEME.warning : THEME.success;
  return colorText(levels[idx], color);
}

function computeHeat(market: MarketInfo) {
  const volume = market.volume24hr ?? 0;
  const priceChange = Math.abs(market.priceChange24hr ?? 0);
  const bestBid = market.bestBid;
  const bestAsk = market.bestAsk;
  const spread = bestBid !== undefined && bestAsk !== undefined ? bestAsk - bestBid : undefined;
  const normVolume = Math.min(1, Math.log10(volume + 1) / 6);
  const normChange = Math.min(1, priceChange);
  const normSpread = spread !== undefined ? Math.max(0, 1 - spread * 10) : 0.3;
  return Math.min(1, normVolume * 0.5 + normChange * 0.3 + normSpread * 0.2);
}

function midpointFrom(bestBid?: number, bestAsk?: number) {
  if (bestBid === undefined || bestAsk === undefined) return undefined;
  return (bestBid + bestAsk) / 2;
}

function updateLevels(
  levels: OrderbookLevel[],
  price: number,
  size: number,
  desc: boolean,
  limit: number
) {
  const next = levels.slice();
  const idx = next.findIndex((level) => level.price === price);
  if (size <= 0) {
    if (idx >= 0) next.splice(idx, 1);
  } else if (idx >= 0) {
    next[idx] = { price, size };
  } else {
    next.push({ price, size });
  }
  next.sort((a, b) => (desc ? b.price - a.price : a.price - b.price));
  return next.slice(0, limit);
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

function cell(value: string) {
  return textCell(value);
}

function textCell(value: string) {
  return escapeTags(value ?? "-");
}

function renderTable(rows: string[][]) {
  if (rows.length === 0) return "";
  const colWidths: number[] = [];
  rows.forEach((row) => {
    row.forEach((cellValue, idx) => {
      const width = visibleLength(String(cellValue ?? ""));
      colWidths[idx] = Math.max(colWidths[idx] || 0, width);
    });
  });

  return rows
    .map((row) =>
      row
        .map((cellValue, idx) => padCell(String(cellValue ?? ""), (colWidths[idx] || 0) + 1))
        .join("")
        .trimEnd()
    )
    .join("\n");
}

function padCell(value: string, width: number) {
  const len = visibleLength(value);
  if (len >= width) return value;
  return value + " ".repeat(width - len);
}

function escapeTags(value: string) {
  return value.replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

function stripTags(value: string) {
  return value.replace(/\{[^}]+\}/g, "").replace(/\\\{/g, "{").replace(/\\\}/g, "}");
}

function visibleLength(value: string) {
  return stripTags(value).length;
}

function colorText(value: string, color: string) {
  return `{${color}-fg}${value}{/}`;
}

function statusColor(status: string, stale: boolean) {
  if (stale) return THEME.warning;
  if (status === "connected") return THEME.success;
  if (status === "connecting") return THEME.warning;
  if (status === "stale") return THEME.warning;
  if (status === "closed") return THEME.danger;
  if (status === "error") return THEME.danger;
  return THEME.muted;
}
