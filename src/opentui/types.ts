/**
 * OpenTUI-specific type definitions.
 * Re-exports and extends types from parent modules.
 */

import type { MarketInfo } from "../api.js";
import type { OrderbookState } from "../parsers.js";

/**
 * Dashboard state for OpenTUI backend
 */
export interface DashboardState {
  // Market data
  radar: MarketInfo[];
  focusIndex: number;
  outcomeIndex: number;
  orderbook: OrderbookState | null;
  orderbookMap: Map<string, OrderbookState>;
  historySeries: number[];

  // Pricing
  bestBid: number | undefined;
  bestAsk: number | undefined;
  midpoint: number | undefined;
  lastTrade: number | undefined;
  lastTradePrev: number | undefined;

  // Status
  wsStatus: WsStatus;
  noOrderbook: boolean;
  noOrderbookTokens: Set<string>;
  autoSkipNoOrderbook: boolean;
  isLoading: boolean;
  error: string | null;

  // Timing
  lastWsAt: number;
  lastRestAt: number;
  lastHistoryAt: number;
  lastHoldersAt: number;
  lastReconcileAt: number;
  lastNoOrderbookAt: number;

  // Alerts
  lastAlert: string;
  priceAlertHigh: number | null;
  priceAlertLow: number | null;

  // Filter
  radarFilter: string;

  // Stats
  msgCount: number;
  msgRate: number;

  // UI state (CRITICAL for modals)
  showDetail: boolean;
  showHelp: boolean;
}

/**
 * WebSocket connection status
 */
export type WsStatus = "off" | "connecting" | "connected" | "disconnected";

/**
 * State change event
 */
export interface StateChangeEvent {
  type: string;
  previousValue?: unknown;
  newValue?: unknown;
}

/**
 * Component render data
 */
export interface RenderData {
  state: DashboardState;
  focusMarket: MarketInfo | null;
  tokenId: string | null;
}

/**
 * Health score for market
 */
export interface HealthScore {
  score: number;
  label: string;
  color: string;
}

/**
 * Keyboard event from OpenTUI
 */
export interface TUIKeyEvent {
  name: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/**
 * Cleanup handler for graceful shutdown
 */
export interface CleanupHandler {
  cleanup: () => void | Promise<void>;
  priority: number;
}

/**
 * Default state factory
 */
export function createDefaultState(): DashboardState {
  return {
    radar: [],
    focusIndex: 0,
    outcomeIndex: 0,
    orderbook: null,
    orderbookMap: new Map(),
    historySeries: [],
    bestBid: undefined,
    bestAsk: undefined,
    midpoint: undefined,
    lastTrade: undefined,
    lastTradePrev: undefined,
    wsStatus: "off",
    noOrderbook: false,
    noOrderbookTokens: new Set(),
    autoSkipNoOrderbook: false,
    isLoading: false,
    error: null,
    lastWsAt: 0,
    lastRestAt: 0,
    lastHistoryAt: 0,
    lastHoldersAt: 0,
    lastReconcileAt: 0,
    lastNoOrderbookAt: 0,
    lastAlert: "",
    priceAlertHigh: null,
    priceAlertLow: null,
    radarFilter: "",
    msgCount: 0,
    msgRate: 0,
    showDetail: false,
    showHelp: false,
  };
}

/**
 * Get focused market from state
 */
export function getFocusedMarket(state: DashboardState): MarketInfo | null {
  if (state.radar.length === 0) {
    return null;
  }
  const index = Math.min(state.focusIndex, state.radar.length - 1);
  return state.radar[index] ?? null;
}

/**
 * Get current token ID from state
 */
export function getCurrentTokenId(state: DashboardState): string | null {
  const market = getFocusedMarket(state);
  if (!market) {
    return null;
  }
  return market.clobTokenIds[state.outcomeIndex] ?? market.clobTokenIds[0] ?? null;
}

/**
 * TUI Panel references
 * Note: Uses generic types to avoid importing @opentui/core types directly
 */
export interface TUIPanels<BoxType, ScrollBoxType> {
  header: BoxType;
  radarBox: ScrollBoxType;
  marketBox: BoxType;
  pulseBox: BoxType;
  orderbookBox: BoxType;
  historyBox: BoxType;
  holdersBox: ScrollBoxType;
  alertsBox: BoxType;
  footer: BoxType;
  detailModal: ScrollBoxType;
  helpModal: BoxType;
  mainContainer: BoxType;
}

/**
 * Validated dashboard options
 */
export interface ValidatedDashboardOptions {
  limit: number;
  slug?: string;
  market?: string;
  intervalMs: number;
  ws: boolean;
}

/**
 * Validate dashboard options with defaults
 */
export function validateDashboardOptions(options: {
  limit?: number;
  slug?: string;
  market?: string;
  intervalMs?: number;
  ws?: boolean;
}): ValidatedDashboardOptions {
  const limit = options.limit ?? 50;
  if (typeof limit !== "number" || limit < 1 || limit > 1000) {
    throw new Error("Invalid limit: must be a number between 1 and 1000");
  }

  const intervalMs = options.intervalMs ?? 1000;
  if (typeof intervalMs !== "number" || intervalMs < 100 || intervalMs > 60000) {
    throw new Error("Invalid intervalMs: must be between 100ms and 60000ms");
  }

  return {
    limit,
    slug: options.slug,
    market: options.market,
    intervalMs,
    ws: options.ws ?? true,
  };
}
