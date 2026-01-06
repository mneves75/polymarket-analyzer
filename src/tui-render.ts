import type { MarketInfo } from "./api";
import type { OrderbookState } from "./parsers";
import { type HealthScore, THEME } from "./tui-types";

export function colorText(value: string, color: string): string {
	return `{${color}-fg}${value}{/}`;
}

export function escapeTags(value: string): string {
	return value.replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

export function stripTags(value: string): string {
	return value
		.replace(/\{[^}]+\}/g, "")
		.replace(/\\\{/g, "{")
		.replace(/\\\}/g, "}");
}

export function visibleLength(value: string): number {
	return stripTags(value).length;
}

export function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return `${value.slice(0, Math.max(0, max - 3))}...`;
}

export function truncateAlert(message: string, maxLen = 100): string {
	const tokenIdMatch = message.match(/token_id=([a-zA-Z0-9]{20,})/);
	if (tokenIdMatch) {
		const fullId = tokenIdMatch[1];
		if (fullId !== undefined) {
			const shortId = `${fullId.slice(0, 8)}...${fullId.slice(-6)}`;
			message = message.replace(fullId, shortId);
		}
	}
	if (message.length > maxLen) {
		return `${message.slice(0, maxLen - 3)}...`;
	}
	return message;
}

export function cell(value: string): string {
	return textCell(value);
}

export function textCell(value: string): string {
	return escapeTags(value ?? "-");
}

export function padCell(value: string, width: number): string {
	const len = visibleLength(value);
	if (len >= width) return value;
	return value + " ".repeat(width - len);
}

export function renderTable(rows: string[][], padding = 2): string {
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
				.map((cellValue, idx) =>
					padCell(String(cellValue ?? ""), (colWidths[idx] || 0) + padding),
				)
				.join("")
				.trimEnd(),
		)
		.join("\n");
}

export function statusColor(status: string, stale: boolean): string {
	if (stale) return THEME.warning;
	if (status === "connected") return THEME.success;
	if (status === "connecting") return THEME.warning;
	if (status === "stale") return THEME.warning;
	if (status === "closed") return THEME.danger;
	if (status === "error") return THEME.danger;
	return THEME.muted;
}

export function computeHeat(market: MarketInfo): number {
	const volume = market.volume24hr ?? 0;
	const priceChange = Math.abs(market.priceChange24hr ?? 0);
	const bestBid = market.bestBid;
	const bestAsk = market.bestAsk;
	const spread =
		bestBid !== undefined && bestAsk !== undefined
			? bestAsk - bestBid
			: undefined;
	const normVolume = Math.min(1, Math.log10(volume + 1) / 6);
	const normChange = Math.min(1, priceChange);
	const normSpread = spread !== undefined ? Math.max(0, 1 - spread * 10) : 0.3;
	return Math.min(1, normVolume * 0.5 + normChange * 0.3 + normSpread * 0.2);
}

export function heatSymbol(market: MarketInfo): string {
	const heat = computeHeat(market);
	const levels = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];
	const idx = Math.max(
		0,
		Math.min(levels.length - 1, Math.floor(heat * (levels.length - 1))),
	);
	const symbol = levels[idx];
	if (!symbol) return " ";
	const color =
		heat > 0.7 ? THEME.danger : heat > 0.4 ? THEME.warning : THEME.success;
	return colorText(symbol, color);
}

export function computeHealthScore(opts: {
	noOrderbook: boolean;
	bestBid: number | undefined;
	bestAsk: number | undefined;
	orderbook: OrderbookState | null;
	volume24hr: number | undefined;
}): HealthScore {
	if (opts.noOrderbook) return { score: 0, label: "N/A", color: THEME.muted };

	let score = 0;
	const spread =
		opts.bestBid !== undefined && opts.bestAsk !== undefined
			? opts.bestAsk - opts.bestBid
			: undefined;
	const bidDepth =
		opts.orderbook?.bids?.reduce((sum, l) => sum + l.size, 0) ?? 0;
	const askDepth =
		opts.orderbook?.asks?.reduce((sum, l) => sum + l.size, 0) ?? 0;
	const totalDepth = bidDepth + askDepth;
	const volume = opts.volume24hr ?? 0;

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

export function filterRadar(list: MarketInfo[], query: string): MarketInfo[] {
	if (!query) return list;
	const q = query.toLowerCase();
	return list.filter((market) => {
		const hay =
			`${market.question || ""} ${market.eventTitle || ""} ${market.slug || ""}`.toLowerCase();
		return hay.includes(q);
	});
}
