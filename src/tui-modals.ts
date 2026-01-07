import type { MarketInfo } from "./api";
import type { OrderbookState } from "./parsers";
import { colorText, textCell } from "./tui-render";
import type { HealthScore, LoadingState } from "./tui-types";
import { THEME } from "./tui-types";
import {
	asciiLineChart,
	formatNumber,
	formatPct,
	formatPrice,
	sanitizeChartData,
} from "./utils";

export interface DetailModalState {
	focusMarket: MarketInfo | null;
	outcomeIndex: number;
	bestBid: number | undefined;
	bestAsk: number | undefined;
	midpoint: number | undefined;
	lastTrade: number | undefined;
	noOrderbook: boolean;
	orderbook: OrderbookState | null;
	historySeries: number[];
	healthScore: HealthScore;
	/** Per-section loading state for responsive UI feedback */
	loading: LoadingState;
}

export interface HelpModalState {
	autoSkipNoOrderbook: boolean;
	priceAlertHigh: number | null;
	priceAlertLow: number | null;
}

export function generateDetailContent(state: DetailModalState): string {
	const {
		focusMarket,
		outcomeIndex,
		bestBid,
		bestAsk,
		midpoint,
		lastTrade,
		noOrderbook,
		orderbook,
		historySeries,
		healthScore,
		loading,
	} = state;

	if (!focusMarket) {
		return colorText("No market selected", THEME.muted);
	}

	const tokenId =
		focusMarket.clobTokenIds[outcomeIndex] ?? focusMarket.clobTokenIds[0];
	if (!tokenId) {
		return colorText("No token ID available for this market", THEME.muted);
	}

	const outcome =
		focusMarket.outcomes[outcomeIndex] || `OUTCOME_${outcomeIndex + 1}`;
	const spread =
		bestBid !== undefined && bestAsk !== undefined
			? bestAsk - bestBid
			: undefined;

	const lines: string[] = [
		colorText("=== MARKET INFORMATION ===", THEME.accent),
		"",
		`${colorText("Event:", THEME.muted)} ${textCell(focusMarket.eventTitle || "-")}`,
		`${colorText("Question:", THEME.muted)} ${textCell(focusMarket.question || "-")}`,
		`${colorText("Condition ID:", THEME.muted)} ${textCell(focusMarket.conditionId || "-")}`,
		`${colorText("Market ID:", THEME.muted)} ${textCell(focusMarket.marketId || "-")}`,
		`${colorText("Slug:", THEME.muted)} ${textCell(focusMarket.slug || "-")}`,
		`${colorText("URL:", THEME.muted)} ${colorText(focusMarket.slug ? `https://polymarket.com/event/${focusMarket.slug}` : "-", THEME.accent)}`,
		"",
		colorText("=== OUTCOME ===", THEME.accent),
		"",
		`${colorText("Selected:", THEME.muted)} ${textCell(outcome)} (${outcomeIndex + 1}/${focusMarket.clobTokenIds.length})`,
		`${colorText("Token ID:", THEME.muted)} ${textCell(tokenId)}`,
		`${colorText("All Outcomes:", THEME.muted)} ${focusMarket.outcomes.join(", ")}`,
		"",
		colorText("=== PRICING ===", THEME.accent),
		"",
	];

	// Show loading indicator or pricing data
	if (loading.pricing) {
		lines.push(colorText("  Loading pricing data...", THEME.warning));
	} else {
		lines.push(
			`${colorText("Best Bid:", THEME.muted)} ${colorText(formatPrice(bestBid), THEME.success)}`,
		);
		lines.push(
			`${colorText("Best Ask:", THEME.muted)} ${colorText(formatPrice(bestAsk), THEME.danger)}`,
		);
		lines.push(
			`${colorText("Spread:", THEME.muted)} ${colorText(formatPrice(spread), spread && spread < 0.03 ? THEME.success : THEME.warning)}`,
		);
		lines.push(
			`${colorText("Midpoint:", THEME.muted)} ${colorText(formatPrice(midpoint), THEME.accent)}`,
		);
		lines.push(
			`${colorText("Last Trade:", THEME.muted)} ${colorText(formatPrice(lastTrade), THEME.accent)}`,
		);
	}

	lines.push("");
	lines.push(colorText("=== MARKET HEALTH ===", THEME.accent));
	lines.push("");
	lines.push(
		`${colorText("Health Grade:", THEME.muted)} ${colorText(`${healthScore.label} (${healthScore.score}/100)`, healthScore.color)}`,
	);
	lines.push(
		`${colorText("24hr Volume:", THEME.muted)} ${colorText(formatNumber(focusMarket.volume24hr), THEME.text)}`,
	);
	lines.push(
		`${colorText("24hr Change:", THEME.muted)} ${colorText(formatPct(focusMarket.priceChange24hr), (focusMarket.priceChange24hr ?? 0) >= 0 ? THEME.success : THEME.danger)}`,
	);
	lines.push(
		`${colorText("Has Orderbook:", THEME.muted)} ${colorText(noOrderbook ? "NO" : "YES", noOrderbook ? THEME.danger : THEME.success)}`,
	);
	lines.push("");

	lines.push(colorText("=== ORDERBOOK (Full) ===", THEME.accent));
	lines.push("");

	if (loading.orderbook) {
		lines.push(colorText("  Loading orderbook...", THEME.warning));
	} else if (orderbook) {
		const bids = orderbook.bids ?? [];
		const asks = orderbook.asks ?? [];
		const maxDepth = Math.max(bids.length, asks.length, 15);

		lines.push(
			`${colorText("BIDS", THEME.success)}                    ${colorText("ASKS", THEME.danger)}`,
		);
		lines.push(
			`${colorText("Price      Size", THEME.muted)}           ${colorText("Price      Size", THEME.muted)}`,
		);

		for (let i = 0; i < maxDepth; i++) {
			const bid = bids[i];
			const ask = asks[i];
			const bidStr = bid
				? `${formatPrice(bid.price).padEnd(10)} ${formatNumber(bid.size).padEnd(10)}`
				: "".padEnd(20);
			const askStr = ask
				? `${formatPrice(ask.price).padEnd(10)} ${formatNumber(ask.size)}`
				: "";
			lines.push(
				`${colorText(bidStr, THEME.success)}    ${colorText(askStr, THEME.danger)}`,
			);
		}

		lines.push("");
		if (orderbook.tickSize !== undefined)
			lines.push(
				`${colorText("Tick Size:", THEME.muted)} ${orderbook.tickSize}`,
			);
		if (orderbook.minOrderSize !== undefined)
			lines.push(
				`${colorText("Min Order:", THEME.muted)} ${orderbook.minOrderSize}`,
			);
		if (orderbook.negRisk !== undefined)
			lines.push(
				`${colorText("Neg Risk:", THEME.muted)} ${String(orderbook.negRisk)}`,
			);
	}

	lines.push("");
	lines.push(colorText("=== PRICE HISTORY ===", THEME.accent));
	lines.push("");

	if (loading.history) {
		lines.push(colorText("  Loading price history...", THEME.warning));
	} else if (historySeries.length > 0) {
		// Use line chart for cleaner Polymarket-style visualization
		const chartLines = asciiLineChart(historySeries, {
			width: 60,
			height: 8,
			offset: 2,
		});
		for (const chartLine of chartLines) {
			lines.push(colorText(chartLine, THEME.accent));
		}
		lines.push("");
		// Calculate stats using sanitized data to handle any NaN values
		const { data: cleanData } = sanitizeChartData(historySeries);
		if (cleanData.length > 0) {
			const min = Math.min(...cleanData);
			const max = Math.max(...cleanData);
			const avg = cleanData.reduce((a, b) => a + b, 0) / cleanData.length;
			lines.push(
				`${colorText("Min:", THEME.muted)} ${formatPrice(min)}  ${colorText("Max:", THEME.muted)} ${formatPrice(max)}  ${colorText("Avg:", THEME.muted)} ${formatPrice(avg)}  ${colorText("Points:", THEME.muted)} ${cleanData.length}`,
			);
		}
	} else {
		lines.push(colorText("  No history data available", THEME.muted));
	}

	lines.push("");
	lines.push(colorText("Press Enter or ESC to close", THEME.muted));

	return lines.join("\n");
}

export function generateHelpContent(state: HelpModalState): string {
	const { autoSkipNoOrderbook, priceAlertHigh, priceAlertLow } = state;
	const skipLabel = autoSkipNoOrderbook ? "ON" : "off";
	const alertsActive = priceAlertHigh !== null || priceAlertLow !== null;

	const lines: string[] = [
		colorText("=== NAVIGATION ===", THEME.accent),
		"",
		`  ${colorText("n", THEME.success)}        Next market in radar`,
		`  ${colorText("p", THEME.success)}        Previous market in radar`,
		`  ${colorText("j, ↓", THEME.success)}     Scroll radar down`,
		`  ${colorText("k, ↑", THEME.success)}     Scroll radar up`,
		`  ${colorText("o", THEME.success)}        Swap outcome (YES/NO)`,
		`  ${colorText("Enter", THEME.success)}    Show detail view`,
		`  ${colorText("ESC", THEME.success)}      Close modals`,
		"",
		colorText("=== DATA ===", THEME.accent),
		"",
		`  ${colorText("r", THEME.success)}        Refresh all data`,
		`  ${colorText("f, /", THEME.success)}     Filter radar by query`,
		"",
		colorText("=== FEATURES ===", THEME.accent),
		"",
		`  ${colorText("a", THEME.success)}        Toggle auto-skip [${skipLabel}]`,
		`             Skip markets without orderbooks`,
		`  ${colorText("t", THEME.success)}        Set price alert`,
		`             Syntax: >0.6 or <0.4 or both`,
		`             Current: ${alertsActive ? "Active" : "None"}`,
		"",
		colorText("=== EXPORT ===", THEME.accent),
		"",
		`  ${colorText("s", THEME.success)}        Save snapshot to JSON`,
		`             Saves to snapshots/ directory`,
		`  ${colorText("e", THEME.success)}        Export history to CSV`,
		`             Saves to exports/ directory`,
		"",
		colorText("=== OTHER ===", THEME.accent),
		"",
		`  ${colorText("h, ?", THEME.success)}     Show this help`,
		`  ${colorText("q", THEME.success)}        Quit application`,
		`  ${colorText("Ctrl-C", THEME.success)}   Quit application`,
		"",
		colorText("Press h, ?, or ESC to close", THEME.muted),
	];

	return lines.join("\n");
}
