import { mkdir, writeFile } from "node:fs/promises";
import blessed from "blessed";
import {
	getHolders,
	getMidpoint,
	getOrderbook,
	getPriceHistory,
	getPrices,
	type MarketInfo,
} from "./api";
import { CONFIG } from "./config";
import { isNoOrderbookError } from "./http";
import { logError } from "./logger";
import { loadRadar, resolveMarket } from "./market";
import {
	extractHistory,
	extractMidpoint,
	extractPrice,
	normalizeHolders,
	normalizeOrderbook,
	type OrderbookLevel,
	type OrderbookState,
} from "./parsers";
import { generateDetailContent, generateHelpContent } from "./tui-modals";
import {
	cell,
	colorText,
	escapeTags,
	filterRadar,
	heatSymbol,
	renderTable,
	statusColor,
	textCell,
	truncate,
	truncateAlert,
} from "./tui-render";
import { type DashboardOptions, THEME } from "./tui-types";
import {
	asciiSparkline,
	formatNumber,
	formatPct,
	formatPrice,
	midpointFrom,
} from "./utils";
import { connectMarketWs } from "./ws";

export type { DashboardOptions } from "./tui-types";

export async function runDashboard(opts: DashboardOptions) {
	const screen = blessed.screen({
		smartCSR: true,
		title: "Polymarket Pulse",
	});

	const header = blessed.box({
		top: 0,
		left: 0,
		width: "100%",
		height: 1,
		tags: true,
		style: { fg: THEME.headerFg, bg: THEME.headerBg },
	});

	const radarTable = blessed.box({
		top: 1,
		left: 0,
		width: "40%",
		height: "30%",
		border: "line",
		label: "Radar",
		tags: true,
		scrollable: true,
		alwaysScroll: true,
		keys: true,
		vi: true,
		mouse: true,
		scrollbar: {
			ch: "│",
			track: { bg: "black" },
			style: { bg: THEME.accent },
		},
		style: {
			fg: THEME.text,
			border: { fg: THEME.border },
			label: { fg: THEME.label },
		},
	});

	const marketBox = blessed.box({
		top: 1,
		left: "40%",
		width: "60%",
		height: "30%",
		border: "line",
		label: "Market",
		tags: true,
		style: {
			fg: THEME.text,
			border: { fg: THEME.border },
			label: { fg: THEME.label },
		},
	});

	const statsBox = blessed.box({
		top: "31%",
		left: 0,
		width: "40%",
		height: "20%",
		border: "line",
		label: "Pulse",
		tags: true,
		style: {
			fg: THEME.text,
			border: { fg: THEME.border },
			label: { fg: THEME.label },
		},
	});

	const orderbookTable = blessed.box({
		top: "31%",
		left: "40%",
		width: "60%",
		height: "20%",
		border: "line",
		label: "Orderbook",
		tags: true,
		style: {
			fg: THEME.text,
			border: { fg: THEME.border },
			label: { fg: THEME.label },
		},
	});

	const historyBox = blessed.box({
		top: "51%",
		left: 0,
		width: "40%",
		height: "20%",
		border: "line",
		label: "History",
		tags: true,
		style: {
			fg: THEME.text,
			border: { fg: THEME.border },
			label: { fg: THEME.label },
		},
	});

	const holdersTable = blessed.box({
		top: "51%",
		left: "40%",
		width: "60%",
		height: "20%",
		border: "line",
		label: "Holders",
		tags: true,
		style: {
			fg: THEME.text,
			border: { fg: THEME.border },
			label: { fg: THEME.label },
		},
	});

	const alertsBox = blessed.box({
		top: "71%",
		left: 0,
		width: "100%",
		height: "20%",
		border: "line",
		label: "Alerts & Status",
		tags: true,
		style: {
			fg: THEME.text,
			border: { fg: THEME.border },
			label: { fg: THEME.label },
		},
	});

	const footer = blessed.box({
		bottom: 0,
		left: 0,
		width: "100%",
		height: 1,
		tags: true,
		style: { fg: THEME.text, bg: "black" },
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
		hidden: true,
	});

	const alertPrompt = blessed.prompt({
		parent: screen,
		top: "center",
		left: "center",
		width: "60%",
		height: 7,
		border: "line",
		label: "Set price alert (e.g. >0.6 or <0.4 or clear)",
		tags: false,
		hidden: true,
	});

	const detailModal = blessed.box({
		parent: screen,
		top: "center",
		left: "center",
		width: "80%",
		height: "80%",
		border: "line",
		label: "Market Detail",
		tags: true,
		hidden: true,
		scrollable: true,
		alwaysScroll: true,
		keys: true,
		vi: true,
		mouse: true,
		scrollbar: {
			ch: "|",
			track: { bg: "black" },
			style: { bg: THEME.accent },
		},
		style: {
			fg: THEME.text,
			border: { fg: THEME.accent },
			label: { fg: THEME.label },
		},
	});

	const helpModal = blessed.box({
		parent: screen,
		top: "center",
		left: "center",
		width: "60%",
		height: "60%",
		border: "line",
		label: "Help - Keyboard Shortcuts",
		tags: true,
		hidden: true,
		style: {
			fg: THEME.text,
			border: { fg: THEME.accent },
			label: { fg: THEME.label },
		},
	});

	const notificationBox = blessed.box({
		parent: screen,
		top: 2,
		right: 1,
		width: "50%",
		height: 3,
		border: "line",
		tags: true,
		hidden: true,
		style: {
			fg: THEME.text,
			bg: "black",
			border: { fg: THEME.danger },
			label: { fg: THEME.danger },
		},
	});

	let notificationTimeout: ReturnType<typeof setTimeout> | null = null;

	function showNotification(
		message: string,
		type: "error" | "warning" | "info" = "error",
		durationMs = 5000,
	) {
		const borderColor =
			type === "error"
				? THEME.danger
				: type === "warning"
					? THEME.warning
					: THEME.accent;
		const label =
			type === "error" ? "Error" : type === "warning" ? "Warning" : "Info";
		notificationBox.style.border = { fg: borderColor };
		notificationBox.setLabel(` ${label} `);
		notificationBox.setContent(
			` ${colorText(escapeTags(message), borderColor)}`,
		);
		notificationBox.show();
		screen.render();

		if (notificationTimeout) clearTimeout(notificationTimeout);
		notificationTimeout = setTimeout(() => {
			notificationBox.hide();
			screen.render();
		}, durationMs);
	}

	screen.append(header);
	screen.append(radarTable);
	screen.append(marketBox);
	screen.append(statsBox);
	screen.append(orderbookTable);
	screen.append(historyBox);
	screen.append(holdersTable);
	screen.append(alertsBox);
	screen.append(footer);
	screen.append(detailModal);
	screen.append(helpModal);

	radarTable.setContent(
		renderTable([[cell("#"), cell("Heat"), cell("Event"), cell("Outcome")]]),
	);
	orderbookTable.setContent(
		renderTable([[cell("bid"), cell("size"), cell("ask"), cell("size")]]),
	);
	holdersTable.setContent(
		renderTable([[cell("rank"), cell("address"), cell("shares")]]),
	);

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
	const noOrderbookTokens = new Set<string>();
	let autoSkipNoOrderbook = false;
	let priceAlertHigh: number | null = null;
	let priceAlertLow: number | null = null;
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
	let showDetail = false;
	let showHelp = false;
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
				const match = radar.find(
					(item) => item.conditionId === focusMarket?.conditionId,
				);
				if (match) focusMarket = match;
			}
			render();
		} catch (err) {
			logError("Radar", err);
			showNotification(`Radar: ${(err as Error).message}`, "error");
		}
	}

	async function refreshFocus(force = false) {
		if (!focusMarket) return;
		const tokenId =
			focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
		if (!tokenId) return;
		const now = Date.now();

		if (!force && isWsHealthy() && now - lastReconcileAt < CONFIG.reconcileMs) {
			if (bestBid !== undefined && bestAsk !== undefined) {
				midpoint = midpointFrom(bestBid, bestAsk) ?? midpoint;
			}
			return;
		}

		const shouldFetchMidpoint =
			force ||
			!noOrderbook ||
			now - lastNoOrderbookAt > CONFIG.noOrderbookCooldownMs;
		const midPromise = shouldFetchMidpoint
			? getMidpoint(tokenId)
			: Promise.resolve(null);

		const [bookRes, pricesRes, midRes] = await Promise.allSettled([
			getOrderbook(tokenId, { allowNoOrderbook: true }),
			getPrices(tokenId, { allowNoOrderbook: true }),
			midPromise,
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
				const message =
					(bookRes.reason as Error).message ?? String(bookRes.reason);
				logError("Orderbook", bookRes.reason);
				lastAlert = truncateAlert(`orderbook error: ${message}`);
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
				const message =
					(pricesRes.reason as Error).message ?? String(pricesRes.reason);
				logError("Prices", pricesRes.reason);
				lastAlert = truncateAlert(`prices error: ${message}`);
			}
		}

		if (midRes.status === "fulfilled" && midRes.value) {
			midpoint = extractMidpoint(midRes.value);
		} else if (midRes.status === "rejected") {
			if (isNoOrderbookError(midRes.reason)) {
				noOrderbookThisRefresh = true;
			} else {
				const message =
					(midRes.reason as Error).message ?? String(midRes.reason);
				logError("Midpoint", midRes.reason);
				lastAlert = truncateAlert(`midpoint error: ${message}`);
			}
			midpoint = midpointFrom(bestBid, bestAsk) ?? midpoint;
		} else {
			midpoint = midpointFrom(bestBid, bestAsk) ?? midpoint;
		}

		noOrderbook = noOrderbookThisRefresh;
		lastNoOrderbookAt = noOrderbook ? Date.now() : 0;
		if (noOrderbook) {
			noOrderbookTokens.add(tokenId);
		} else {
			noOrderbookTokens.delete(tokenId);
		}
		if (
			!noOrderbook &&
			lastAlert !== "" &&
			lastAlert.toLowerCase().includes("no orderbook exists")
		) {
			lastAlert = "";
		}

		lastRestAt = Date.now();
		lastReconcileAt = Date.now();
		render();
		if (showDetail) {
			renderDetailModal();
			screen.render();
		}
	}

	async function refreshHistory() {
		if (!focusMarket) return;
		const tokenId =
			focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
		if (!tokenId) return;
		try {
			const history = await getPriceHistory(tokenId);
			historySeries = extractHistory(history);
			lastHistoryAt = Date.now();
			lastRestAt = Date.now();
			render();
			if (showDetail) {
				renderDetailModal();
				screen.render();
			}
		} catch (err) {
			logError("History", err);
			showNotification(`History: ${(err as Error).message}`, "error");
		}
	}

	async function refreshHolders() {
		if (!focusMarket?.conditionId) return;
		try {
			const holders = await getHolders(
				focusMarket.conditionId,
				CONFIG.holdersLimit,
			);
			renderHolders(holders);
			lastHoldersAt = Date.now();
			lastRestAt = Date.now();
		} catch (err) {
			logError("Holders", err);
			showNotification(`Holders: ${(err as Error).message}`, "error");
		}
	}

	function swapOutcome(delta: number) {
		if (!focusMarket) return;
		outcomeIndex =
			(outcomeIndex + delta + focusMarket.clobTokenIds.length) %
			focusMarket.clobTokenIds.length;
		const tokenId = focusMarket.clobTokenIds[outcomeIndex];
		if (!tokenId) return;
		orderbook = orderbookMap.get(tokenId) ?? orderbook;
		historySeries = []; // Clear stale chart data for new outcome
		refreshFocus();
		refreshHistory();
		render();
		if (showDetail) {
			renderDetailModal();
			screen.render();
		}
	}

	function hasOrderbook(market: MarketInfo): boolean {
		return !market.clobTokenIds.some((tid) => noOrderbookTokens.has(tid));
	}

	function findNextMarket(
		view: MarketInfo[],
		currentIdx: number,
		delta: number,
	): number {
		if (!autoSkipNoOrderbook) {
			return (currentIdx + delta + view.length) % view.length;
		}
		let idx = currentIdx;
		for (let i = 0; i < view.length; i++) {
			idx = (idx + delta + view.length) % view.length;
			const market = view[idx];
			if (market && hasOrderbook(market)) return idx;
		}
		return (currentIdx + delta + view.length) % view.length;
	}

	function render() {
		const now = Date.now();
		const wsAgeRaw = lastWsAt ? `${Math.round((now - lastWsAt) / 1000)}s` : "-";
		const restAgeRaw = lastRestAt
			? `${Math.round((now - lastRestAt) / 1000)}s`
			: "-";
		const wsStale = lastWsAt ? now - lastWsAt > CONFIG.wsStaleMs : false;
		const restStale = lastRestAt
			? now - lastRestAt > CONFIG.restStaleMs
			: false;
		const filterLabel = radarFilter
			? `filter="${escapeTags(radarFilter)}"`
			: "filter=all";
		const wsLabel = colorText(
			escapeTags(wsStatus),
			statusColor(wsStatus, wsStale),
		);
		const wsAge = colorText(wsAgeRaw, wsStale ? THEME.warning : THEME.muted);
		const restAge = colorText(
			restAgeRaw,
			restStale ? THEME.warning : THEME.muted,
		);
		const msgRateLabel = colorText(
			String(msgRate),
			msgRate > 0 ? THEME.success : THEME.muted,
		);
		header.setContent(
			` Polymarket Pulse | ${new Date().toLocaleTimeString()} | ws=${wsLabel} (${wsAge}) | rest=${restAge} | ${filterLabel} | msg/s=${msgRateLabel} `,
		);

		renderRadar();
		renderMarket();
		renderPulse();
		renderOrderbook();
		renderHistory();
		renderAlerts();
		const skipLabel = autoSkipNoOrderbook
			? colorText("ON", THEME.success)
			: colorText("off", THEME.muted);
		footer.setContent(
			`${colorText("keys:", THEME.muted)} q=quit n/p=nav j/k=scroll Enter=detail h=help o=outcome r=refresh f=filter s=save a=skip[${skipLabel}] t=alert e=export`,
		);

		screen.render();
	}

	function renderRadar() {
		const view = filterRadar(radar, radarFilter);
		radarTable.setLabel(` Radar (${view.length}) `);
		const rows = [
			[cell("#"), cell(" "), cell("Heat"), cell("Event"), cell("Outcome")],
		];
		view.forEach((market, idx) => {
			const isFocus = market.conditionId === focusMarket?.conditionId;
			const hasNoOrderbook = market.clobTokenIds.some((tid) =>
				noOrderbookTokens.has(tid),
			);
			const prefix = isFocus ? colorText(">", THEME.accent) : " ";
			const noBookIndicator = hasNoOrderbook
				? colorText("○", THEME.warning)
				: " ";
			rows.push([
				`${prefix}${String(idx + 1).padStart(2, "0")}`,
				noBookIndicator,
				heatSymbol(market),
				textCell(
					truncate(market.question || market.eventTitle || "(no title)", 38),
				),
				textCell(truncate(market.outcomes[0] || "-", 12)),
			]);
		});
		radarTable.setContent(renderTable(rows));
	}

	function renderMarket() {
		if (!focusMarket) {
			marketBox.setContent(colorText("No market selected", THEME.muted));
			return;
		}

		const tokenId =
			focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
		if (!tokenId) {
			marketBox.setContent(
				colorText("No token ID available for this market", THEME.muted),
			);
			return;
		}
		const outcome =
			focusMarket.outcomes[outcomeIndex] || `OUTCOME_${outcomeIndex + 1}`;

		const lines = [
			`${colorText("event:", THEME.muted)} ${textCell(focusMarket.eventTitle || "-")}`,
			`${colorText("question:", THEME.muted)} ${textCell(focusMarket.question || "-")}`,
			`${colorText("condition:", THEME.muted)} ${textCell(focusMarket.conditionId || "-")}`,
			`${colorText("outcome:", THEME.muted)} ${textCell(outcome)} ${colorText(`(${outcomeIndex + 1}/${focusMarket.clobTokenIds.length})`, THEME.muted)}`,
			`${colorText("token:", THEME.muted)} ${textCell(tokenId)}`,
		];

		if (noOrderbook) {
			const age = lastNoOrderbookAt
				? `${Math.round((Date.now() - lastNoOrderbookAt) / 1000)}s`
				: "-";
			lines.push(
				`${colorText("orderbook:", THEME.muted)} ${colorText(`none (${age})`, THEME.muted)}`,
			);
		}

		if (orderbook?.tickSize !== undefined)
			lines.push(`${colorText("tick:", THEME.muted)} ${orderbook.tickSize}`);
		if (orderbook?.minOrderSize !== undefined)
			lines.push(
				`${colorText("min order:", THEME.muted)} ${orderbook.minOrderSize}`,
			);
		if (orderbook?.negRisk !== undefined)
			lines.push(
				`${colorText("neg risk:", THEME.muted)} ${String(orderbook.negRisk)}`,
			);

		marketBox.setContent(lines.join("\n"));
	}

	function computeHealthScore(): {
		score: number;
		label: string;
		color: string;
	} {
		if (noOrderbook) return { score: 0, label: "N/A", color: THEME.muted };

		let score = 0;
		const spread =
			bestBid !== undefined && bestAsk !== undefined
				? bestAsk - bestBid
				: undefined;
		const bidDepth = orderbook?.bids?.reduce((sum, l) => sum + l.size, 0) ?? 0;
		const askDepth = orderbook?.asks?.reduce((sum, l) => sum + l.size, 0) ?? 0;
		const totalDepth = bidDepth + askDepth;
		const volume = focusMarket?.volume24hr ?? 0;

		if (spread !== undefined) {
			if (spread <= 0.01) score += 35;
			else if (spread <= 0.03) score += 25;
			else if (spread <= 0.05) score += 15;
			else if (spread <= 0.1) score += 5;
		}

		if (totalDepth > 10000) score += 35;
		else if (totalDepth > 5000) score += 25;
		else if (totalDepth > 1000) score += 15;
		else if (totalDepth > 100) score += 5;

		if (volume > 100000) score += 30;
		else if (volume > 10000) score += 20;
		else if (volume > 1000) score += 10;
		else if (volume > 100) score += 5;

		const label =
			score >= 80
				? "A"
				: score >= 60
					? "B"
					: score >= 40
						? "C"
						: score >= 20
							? "D"
							: "F";
		const color =
			score >= 80
				? THEME.success
				: score >= 60
					? THEME.accent
					: score >= 40
						? THEME.warning
						: THEME.danger;

		return { score, label, color };
	}

	function renderPulse() {
		const spread =
			bestBid !== undefined && bestAsk !== undefined
				? bestAsk - bestBid
				: undefined;
		const bias = midpoint ?? lastTrade;
		const delta =
			lastTrade !== undefined && lastTradePrev !== undefined
				? lastTrade - lastTradePrev
				: undefined;
		const deltaColor =
			delta === undefined
				? THEME.muted
				: delta > 0
					? THEME.success
					: delta < 0
						? THEME.danger
						: THEME.muted;
		const spreadColor =
			spread === undefined
				? THEME.muted
				: spread < 0.01
					? THEME.success
					: spread < 0.05
						? THEME.warning
						: THEME.danger;
		const bidColor = bestBid === undefined ? THEME.muted : THEME.success;
		const askColor = bestAsk === undefined ? THEME.muted : THEME.danger;
		const health = computeHealthScore();
		const lines = [
			`${colorText("best bid :", THEME.muted)} ${colorText(formatPrice(bestBid), bidColor)}`,
			`${colorText("best ask :", THEME.muted)} ${colorText(formatPrice(bestAsk), askColor)}`,
			`${colorText("spread   :", THEME.muted)} ${colorText(formatPrice(spread), spreadColor)}`,
			`${colorText("midpoint :", THEME.muted)} ${colorText(formatPrice(midpoint), THEME.accent)}`,
			`${colorText("last     :", THEME.muted)} ${colorText(formatPrice(lastTrade), THEME.accent)}`,
			`${colorText("bias     :", THEME.muted)} ${colorText(formatPct(bias), THEME.accent)}`,
			`${colorText("delta    :", THEME.muted)} ${colorText(formatPrice(delta), deltaColor)}`,
			`${colorText("health   :", THEME.muted)} ${colorText(`${health.label} (${health.score})`, health.color)}`,
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
				cell(formatNumber(ask?.size)),
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
		historyBox.setContent(
			`${colorText(spark, THEME.accent)}\n${colorText("last=", THEME.muted)}${colorText(formatPrice(historySeries.at(-1)), THEME.accent)}`,
		);
	}

	function renderAlerts() {
		const now = Date.now();
		const wsAge = lastWsAt ? Math.round((now - lastWsAt) / 1000) : null;
		const restAge = lastRestAt ? Math.round((now - lastRestAt) / 1000) : null;
		const historyAge = lastHistoryAt
			? Math.round((now - lastHistoryAt) / 1000)
			: null;
		const holdersAge = lastHoldersAt
			? Math.round((now - lastHoldersAt) / 1000)
			: null;
		const wsStale = wsAge !== null && wsAge * 1000 > CONFIG.wsStaleMs;
		const restStale = restAge !== null && restAge * 1000 > CONFIG.restStaleMs;

		const alertThresholds = [];
		if (priceAlertHigh !== null) alertThresholds.push(`>=${priceAlertHigh}`);
		if (priceAlertLow !== null) alertThresholds.push(`<=${priceAlertLow}`);
		const alertsLabel =
			alertThresholds.length > 0 ? alertThresholds.join(" ") : "-";

		const lines = [
			`${colorText("ws stale     :", THEME.muted)} ${colorText(wsStale ? "YES" : "no", wsStale ? THEME.danger : THEME.success)} ${colorText(`(${wsAge ?? "-"}s)`, THEME.muted)}`,
			`${colorText("rest stale   :", THEME.muted)} ${colorText(restStale ? "YES" : "no", restStale ? THEME.danger : THEME.success)} ${colorText(`(${restAge ?? "-"}s)`, THEME.muted)}`,
			`${colorText("history age  :", THEME.muted)} ${colorText(`${historyAge ?? "-"}s`, THEME.muted)}`,
			`${colorText("holders age  :", THEME.muted)} ${colorText(`${holdersAge ?? "-"}s`, THEME.muted)}`,
			`${colorText("price alerts :", THEME.muted)} ${colorText(alertsLabel, alertThresholds.length > 0 ? THEME.accent : THEME.muted)}`,
			`${colorText("last alert   :", THEME.muted)} ${colorText(escapeTags(lastAlert || "-"), lastAlert ? THEME.warning : THEME.muted)}`,
			`${colorText("msg/s        :", THEME.muted)} ${colorText(String(msgRate), msgRate > 0 ? THEME.success : THEME.muted)}`,
		];
		alertsBox.setContent(lines.join("\n"));
	}

	function renderHolders(
		data: Array<Record<string, unknown>> | Record<string, unknown>,
	) {
		const holders = normalizeHolders(data);
		const rows = [[cell("rank"), cell("address"), cell("shares")]];
		holders.slice(0, CONFIG.holdersLimit).forEach((holder, idx) => {
			const address = String(holder.address || holder.trader || "-");
			const shares = Number(
				holder.shares || holder.shares_value || holder.value || 0,
			);
			rows.push([
				cell(String(idx + 1)),
				cell(truncate(address, 16)),
				cell(formatNumber(shares)),
			]);
		});

		holdersTable.setContent(renderTable(rows));
	}

	function renderDetailModal() {
		const content = generateDetailContent({
			focusMarket,
			outcomeIndex,
			bestBid,
			bestAsk,
			midpoint,
			lastTrade,
			noOrderbook,
			orderbook,
			historySeries,
			healthScore: computeHealthScore(),
		});
		detailModal.setContent(content);
	}

	function renderHelpModal() {
		const content = generateHelpContent({
			autoSkipNoOrderbook,
			priceAlertHigh,
			priceAlertLow,
		});
		helpModal.setContent(content);
	}

	function applyPriceChange(
		assetId: string,
		side: "BUY" | "SELL",
		price: number,
		size: number,
	) {
		const current = orderbookMap.get(assetId) ?? { bids: [], asks: [] };
		const depthLimit = CONFIG.orderbookDepth * 5;
		const bids =
			side === "BUY"
				? updateLevels(current.bids, price, size, true, depthLimit)
				: current.bids;
		const asks =
			side === "SELL"
				? updateLevels(current.asks, price, size, false, depthLimit)
				: current.asks;
		const updated: OrderbookState = {
			bids,
			asks,
		};
		if (current.minOrderSize !== undefined)
			updated.minOrderSize = current.minOrderSize;
		if (current.tickSize !== undefined) updated.tickSize = current.tickSize;
		if (current.negRisk !== undefined) updated.negRisk = current.negRisk;
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
				showNotification(
					`Resync failed: ${(err as Error).message ?? String(err)}`,
					"warning",
				);
			}
		}, CONFIG.resyncDelayMs);
	}

	function checkAlert() {
		const price = midpoint ?? lastTrade;
		if (price !== undefined) {
			if (priceAlertHigh !== null && price >= priceAlertHigh) {
				lastAlert = `ALERT HIGH: ${price.toFixed(4)} >= ${priceAlertHigh.toFixed(4)}`;
				priceAlertHigh = null;
			}
			if (priceAlertLow !== null && price <= priceAlertLow) {
				lastAlert = `ALERT LOW: ${price.toFixed(4)} <= ${priceAlertLow.toFixed(4)}`;
				priceAlertLow = null;
			}
		}

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
		const tokenId =
			focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
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
				lastRestAt,
			},
			orderbook,
			history: historySeries,
			holdersUpdatedAt: lastHoldersAt,
		};

		await mkdir("snapshots", { recursive: true });
		const file = `snapshots/pm-${focusMarket.conditionId || "market"}-${Date.now()}.json`;
		await writeFile(file, JSON.stringify(snapshot, null, 2));
		footer.setContent(`Snapshot saved: ${file}`);
		screen.render();
	}

	async function exportHistoryCsv() {
		if (!focusMarket) return;
		if (historySeries.length === 0) {
			lastAlert = "No history data to export";
			render();
			return;
		}

		const tokenId =
			focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
		const outcome =
			focusMarket.outcomes[outcomeIndex] || `OUTCOME_${outcomeIndex + 1}`;
		const now = new Date();
		const fidelity = CONFIG.historyFidelity;

		const csvLines = ["timestamp,price,market,outcome,token_id"];
		historySeries.forEach((price, idx) => {
			const minutesAgo = (historySeries.length - 1 - idx) * fidelity;
			const timestamp = new Date(
				now.getTime() - minutesAgo * 60 * 1000,
			).toISOString();
			const marketName = (
				focusMarket?.question ||
				focusMarket?.eventTitle ||
				"market"
			).replace(/,/g, ";");
			csvLines.push(
				`${timestamp},${price.toFixed(6)},${marketName},${outcome},${tokenId}`,
			);
		});

		await mkdir("exports", { recursive: true });
		const file = `exports/pm-history-${focusMarket.conditionId || "market"}-${Date.now()}.csv`;
		await writeFile(file, csvLines.join("\n"));
		lastAlert = `Exported ${historySeries.length} price points to ${file}`;
		render();
	}

	/**
	 * Graceful shutdown handler - cleans up resources before exit.
	 * Called by quit keys (q, Ctrl+C) and OS signals (SIGTERM, SIGINT).
	 *
	 * Uses a guard flag to prevent double execution from rapid signals.
	 */
	let isShuttingDown = false;
	function shutdown() {
		if (isShuttingDown) return;
		isShuttingDown = true;
		wsConnection?.close();
		screen.destroy();
		process.exit(0);
	}

	// Handle OS signals for graceful shutdown (e.g., kill, docker stop)
	// Use once() to auto-remove after first call - standard pattern for shutdown signals
	process.once("SIGTERM", shutdown);
	process.once("SIGINT", shutdown);

	function bindKeys() {
		screen.key(["q", "C-c"], shutdown);

		screen.key(["enter"], () => {
			if (showHelp) {
				showHelp = false;
				helpModal.hide();
				screen.render();
				return;
			}
			showDetail = !showDetail;
			if (showDetail) {
				renderDetailModal();
				detailModal.show();
				detailModal.focus();
			} else {
				detailModal.hide();
			}
			screen.render();
		});

		screen.key(["escape"], () => {
			if (showDetail) {
				showDetail = false;
				detailModal.hide();
				screen.render();
				return;
			}
			if (showHelp) {
				showHelp = false;
				helpModal.hide();
				screen.render();
				return;
			}
		});

		screen.key(["h", "?"], () => {
			if (showDetail) return;
			showHelp = !showHelp;
			if (showHelp) {
				renderHelpModal();
				helpModal.show();
				helpModal.focus();
			} else {
				helpModal.hide();
			}
			screen.render();
		});

		screen.key(["n"], () => {
			const view = filterRadar(radar, radarFilter);
			if (view.length === 0) return;
			const currentIdx = view.findIndex(
				(item) => item.conditionId === focusMarket?.conditionId,
			);
			const nextIdx = findNextMarket(view, currentIdx, 1);
			const nextMarket = view[nextIdx];
			if (!nextMarket) return;
			focusMarket = nextMarket;
			outcomeIndex = 0;
			historySeries = []; // Clear stale chart data for new market
			restartWs();
			refreshFocus();
			refreshHistory();
			refreshHolders();
			render();
			if (showDetail) {
				renderDetailModal();
				screen.render();
			}
		});

		screen.key(["p"], () => {
			const view = filterRadar(radar, radarFilter);
			if (view.length === 0) return;
			const currentIdx = view.findIndex(
				(item) => item.conditionId === focusMarket?.conditionId,
			);
			const prevIdx = findNextMarket(view, currentIdx, -1);
			const prevMarket = view[prevIdx];
			if (!prevMarket) return;
			focusMarket = prevMarket;
			outcomeIndex = 0;
			historySeries = []; // Clear stale chart data for new market
			restartWs();
			refreshFocus();
			refreshHistory();
			refreshHolders();
			render();
			if (showDetail) {
				renderDetailModal();
				screen.render();
			}
		});

		screen.key(["a"], () => {
			autoSkipNoOrderbook = !autoSkipNoOrderbook;
			lastAlert = autoSkipNoOrderbook
				? "auto-skip enabled (skip markets without orderbooks)"
				: "auto-skip disabled";
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
				if (
					view.length > 0 &&
					!view.some((item) => item.conditionId === focusMarket?.conditionId)
				) {
					const nextMarket = view[0];
					if (nextMarket) {
						focusMarket = nextMarket;
						outcomeIndex = 0;
						historySeries = []; // Clear stale chart data for new market
						restartWs();
						refreshFocus();
						refreshHistory();
						refreshHolders();
					}
				}
				render();
			});
		});

		screen.key(["s"], () => {
			saveSnapshot().catch((err) => {
				logError("Snapshot", err);
				showNotification(`Snapshot: ${(err as Error).message}`, "error");
			});
		});

		screen.key(["t"], () => {
			const currentAlerts = [];
			if (priceAlertHigh !== null) currentAlerts.push(`>${priceAlertHigh}`);
			if (priceAlertLow !== null) currentAlerts.push(`<${priceAlertLow}`);
			const currentValue = currentAlerts.join(" ") || "";
			alertPrompt.input("Alert threshold:", currentValue, (err, value) => {
				if (err) return;
				const input = (value || "").trim().toLowerCase();
				if (input === "clear" || input === "") {
					priceAlertHigh = null;
					priceAlertLow = null;
					lastAlert = "Price alerts cleared";
				} else {
					const highMatch = input.match(/>(\d*\.?\d+)/);
					const lowMatch = input.match(/<(\d*\.?\d+)/);
					if (highMatch && highMatch[1] !== undefined) {
						priceAlertHigh = parseFloat(highMatch[1]);
						lastAlert = `Alert set: price >= ${priceAlertHigh}`;
					}
					if (lowMatch && lowMatch[1] !== undefined) {
						priceAlertLow = parseFloat(lowMatch[1]);
						lastAlert = `Alert set: price <= ${priceAlertLow}`;
					}
					if (
						highMatch &&
						lowMatch &&
						priceAlertHigh !== null &&
						priceAlertLow !== null
					) {
						lastAlert = `Alerts set: price >= ${priceAlertHigh} OR price <= ${priceAlertLow}`;
					}
					if (!highMatch && !lowMatch) {
						lastAlert = "Invalid format. Use >0.6 or <0.4 or both";
					}
				}
				render();
			});
		});

		screen.key(["e"], () => {
			exportHistoryCsv().catch((err) => {
				logError("Export", err);
				lastAlert = `Export error: ${(err as Error).message}`;
				render();
			});
		});

		screen.key(["j", "down"], () => {
			// Don't scroll radar when modal is open (modal handles its own scrolling)
			if (showDetail || showHelp) return;
			radarTable.scroll(1);
			screen.render();
		});

		screen.key(["k", "up"], () => {
			// Don't scroll radar when modal is open (modal handles its own scrolling)
			if (showDetail || showHelp) return;
			radarTable.scroll(-1);
			screen.render();
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
				// Only update lastWsAt if we have a valid timestamp
				if (updateTs !== undefined) lastWsAt = updateTs;
				const prevTs = lastTsByAsset.get(update.assetId);
				const prevSeq = lastSeqByAsset.get(update.assetId);
				const prevHash = lastHashByAsset.get(update.assetId);

				if (update.hash && prevHash && update.hash === prevHash) {
					return;
				}
				if (
					update.sequence !== undefined &&
					prevSeq !== undefined &&
					update.sequence !== prevSeq + 1
				) {
					scheduleResync(
						update.assetId,
						`seq gap ${prevSeq}->${update.sequence}`,
					);
				}
				if (updateTs && prevTs && updateTs < prevTs) {
					scheduleResync(update.assetId, "timestamp reorder");
				}
				if (update.hash) lastHashByAsset.set(update.assetId, update.hash);
				if (update.sequence !== undefined)
					lastSeqByAsset.set(update.assetId, update.sequence);
				if (updateTs) lastTsByAsset.set(update.assetId, updateTs);

				if (
					update.eventType === "price_change" &&
					update.side &&
					update.price !== undefined
				) {
					applyPriceChange(
						update.assetId,
						update.side,
						update.price,
						update.size ?? 0,
					);
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
			},
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

function updateLevels(
	levels: OrderbookLevel[],
	price: number,
	size: number,
	desc: boolean,
	limit: number,
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
