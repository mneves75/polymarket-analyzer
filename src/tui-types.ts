import type { MarketInfo } from "./api";
import type { ResolveOptions } from "./market";
import type { OrderbookState } from "./parsers";

export type DashboardOptions = ResolveOptions & {
	intervalMs: number;
	ws: boolean;
};

/**
 * Loading state for each data section in the detail modal.
 * Enables proper skeleton/spinner display during async fetches.
 */
export type LoadingState = {
	pricing: boolean;
	orderbook: boolean;
	history: boolean;
};

export type DashboardState = {
	radar: MarketInfo[];
	focusMarket: MarketInfo | null;
	outcomeIndex: number;
	orderbook: OrderbookState | null;
	orderbookMap: Map<string, OrderbookState>;
	historySeries: number[];
	bestBid: number | undefined;
	bestAsk: number | undefined;
	midpoint: number | undefined;
	lastTrade: number | undefined;
	lastTradePrev: number | undefined;
	noOrderbook: boolean;
	noOrderbookTokens: Set<string>;
	autoSkipNoOrderbook: boolean;
	wsStatus: string;
	lastWsAt: number;
	lastRestAt: number;
	lastHistoryAt: number;
	lastHoldersAt: number;
	lastReconcileAt: number;
	lastNoOrderbookAt: number;
	lastAlert: string;
	priceAlertHigh: number | null;
	priceAlertLow: number | null;
	radarFilter: string;
	msgCount: number;
	msgRate: number;
	showDetail: boolean;
	showHelp: boolean;
	/** Per-section loading state for responsive UI feedback */
	loading: LoadingState;
};

export const THEME = {
	headerBg: "blue",
	headerFg: "white",
	border: "cyan",
	label: "cyan",
	text: "white",
	muted: "gray",
	success: "green",
	warning: "yellow",
	danger: "red",
	accent: "magenta",
} as const;

export type ThemeConfig = typeof THEME;

export type HealthScore = {
	score: number;
	label: string;
	color: string;
};

export type HeatLevel =
	| " "
	| "."
	| ":"
	| "-"
	| "="
	| "+"
	| "*"
	| "#"
	| "%"
	| "@";
