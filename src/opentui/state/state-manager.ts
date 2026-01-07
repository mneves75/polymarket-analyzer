/**
 * Event-driven state manager for OpenTUI dashboard.
 * Provides immutable state updates with event emission.
 */

import { EventEmitter } from "events";
import type { MarketInfo } from "../../api.js";
import type { OrderbookState } from "../../parsers.js";
import { DataError } from "../errors.js";
import { logger } from "../logger.js";
import {
  type DashboardState,
  type StateChangeEvent,
  type WsStatus,
  createDefaultState,
  getFocusedMarket,
} from "../types.js";

/**
 * State manager with event-driven updates
 */
class StateManager extends EventEmitter {
  private state: DashboardState = createDefaultState();

  /**
   * Get current state (readonly)
   */
  get(): Readonly<DashboardState> {
    return this.state;
  }

  /**
   * Get the currently focused market
   */
  getFocusedMarket(): MarketInfo | null {
    return getFocusedMarket(this.state);
  }

  /**
   * Emit a state change event
   */
  private emitChange(type: string, previousValue?: unknown, newValue?: unknown): void {
    const event: StateChangeEvent = { type, previousValue, newValue };
    this.emit("change", event);
    logger.debug(`State change: ${type}`, { previousValue, newValue });
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  setRadar(markets: MarketInfo[]): void {
    if (!Array.isArray(markets)) {
      throw new DataError("Invalid radar data: not an array");
    }
    const previous = this.state.radar;
    this.state = { ...this.state, radar: [...markets] };
    this.emitChange("radar", previous.length, markets.length);
  }

  setFocusIndex(index: number): void {
    if (index < 0) {
      throw new DataError("Invalid focus index: negative", { index });
    }
    if (this.state.radar.length > 0 && index >= this.state.radar.length) {
      throw new DataError("Invalid focus index: out of bounds", {
        index,
        max: this.state.radar.length - 1,
      });
    }
    const previous = this.state.focusIndex;
    this.state = { ...this.state, focusIndex: index };
    this.emitChange("focusIndex", previous, index);
  }

  setOutcomeIndex(index: number): void {
    if (index !== 0 && index !== 1) {
      throw new DataError("Invalid outcome index", { index });
    }
    const previous = this.state.outcomeIndex;
    this.state = { ...this.state, outcomeIndex: index };
    this.emitChange("outcomeIndex", previous, index);
  }

  toggleOutcome(): void {
    const newIndex = this.state.outcomeIndex === 0 ? 1 : 0;
    this.setOutcomeIndex(newIndex);
  }

  setOrderbook(orderbook: OrderbookState | null): void {
    this.state = { ...this.state, orderbook };
    this.emitChange("orderbook", null, orderbook !== null);
  }

  setOrderbookForToken(tokenId: string, orderbook: OrderbookState): void {
    const newMap = new Map(this.state.orderbookMap);
    newMap.set(tokenId, orderbook);
    this.state = { ...this.state, orderbookMap: newMap };
    this.emitChange("orderbookMap", tokenId, true);
  }

  setHistorySeries(series: number[]): void {
    this.state = { ...this.state, historySeries: [...series] };
    this.emitChange("historySeries", 0, series.length);
  }

  // ============================================================================
  // Pricing
  // ============================================================================

  setBestBid(bid: number | undefined): void {
    const previous = this.state.bestBid;
    this.state = { ...this.state, bestBid: bid };
    this.emitChange("bestBid", previous, bid);
  }

  setBestAsk(ask: number | undefined): void {
    const previous = this.state.bestAsk;
    this.state = { ...this.state, bestAsk: ask };
    this.emitChange("bestAsk", previous, ask);
  }

  setMidpoint(midpoint: number | undefined): void {
    const previous = this.state.midpoint;
    this.state = { ...this.state, midpoint };
    this.emitChange("midpoint", previous, midpoint);
  }

  setLastTrade(trade: number | undefined): void {
    const previousPrev = this.state.lastTrade;
    this.state = {
      ...this.state,
      lastTradePrev: this.state.lastTrade,
      lastTrade: trade,
    };
    this.emitChange("lastTrade", previousPrev, trade);
  }

  // ============================================================================
  // Status
  // ============================================================================

  setWsStatus(status: WsStatus): void {
    const previous = this.state.wsStatus;
    this.state = { ...this.state, wsStatus: status };
    this.emitChange("wsStatus", previous, status);
  }

  setNoOrderbook(noOrderbook: boolean): void {
    const previous = this.state.noOrderbook;
    this.state = {
      ...this.state,
      noOrderbook,
      lastNoOrderbookAt: noOrderbook ? Date.now() : 0,
    };
    this.emitChange("noOrderbook", previous, noOrderbook);
  }

  addNoOrderbookToken(tokenId: string): void {
    const newSet = new Set(this.state.noOrderbookTokens);
    newSet.add(tokenId);
    this.state = { ...this.state, noOrderbookTokens: newSet };
    this.emitChange("noOrderbookTokens", null, tokenId);
  }

  removeNoOrderbookToken(tokenId: string): void {
    const newSet = new Set(this.state.noOrderbookTokens);
    newSet.delete(tokenId);
    this.state = { ...this.state, noOrderbookTokens: newSet };
    this.emitChange("noOrderbookTokens", tokenId, null);
  }

  setAutoSkipNoOrderbook(skip: boolean): void {
    const previous = this.state.autoSkipNoOrderbook;
    this.state = { ...this.state, autoSkipNoOrderbook: skip };
    this.emitChange("autoSkipNoOrderbook", previous, skip);
  }

  toggleAutoSkipNoOrderbook(): void {
    this.setAutoSkipNoOrderbook(!this.state.autoSkipNoOrderbook);
  }

  setLoading(loading: boolean): void {
    const previous = this.state.isLoading;
    this.state = { ...this.state, isLoading: loading };
    this.emitChange("isLoading", previous, loading);
  }

  setError(error: string | null): void {
    const previous = this.state.error;
    this.state = { ...this.state, error };
    this.emitChange("error", previous, error);
  }

  // ============================================================================
  // Timing
  // ============================================================================

  updateLastWsAt(): void {
    this.state = { ...this.state, lastWsAt: Date.now() };
  }

  updateLastRestAt(): void {
    this.state = { ...this.state, lastRestAt: Date.now() };
  }

  updateLastHistoryAt(): void {
    this.state = { ...this.state, lastHistoryAt: Date.now() };
  }

  updateLastHoldersAt(): void {
    this.state = { ...this.state, lastHoldersAt: Date.now() };
  }

  updateLastReconcileAt(): void {
    this.state = { ...this.state, lastReconcileAt: Date.now() };
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  setLastAlert(alert: string): void {
    const previous = this.state.lastAlert;
    this.state = { ...this.state, lastAlert: alert };
    this.emitChange("lastAlert", previous, alert);
  }

  setPriceAlertHigh(price: number | null): void {
    const previous = this.state.priceAlertHigh;
    this.state = { ...this.state, priceAlertHigh: price };
    this.emitChange("priceAlertHigh", previous, price);
  }

  setPriceAlertLow(price: number | null): void {
    const previous = this.state.priceAlertLow;
    this.state = { ...this.state, priceAlertLow: price };
    this.emitChange("priceAlertLow", previous, price);
  }

  clearPriceAlerts(): void {
    this.state = {
      ...this.state,
      priceAlertHigh: null,
      priceAlertLow: null,
    };
    this.emitChange("priceAlerts", true, false);
  }

  // ============================================================================
  // Filter
  // ============================================================================

  setRadarFilter(filter: string): void {
    const previous = this.state.radarFilter;
    this.state = { ...this.state, radarFilter: filter };
    this.emitChange("radarFilter", previous, filter);
  }

  // ============================================================================
  // Stats
  // ============================================================================

  incrementMsgCount(): void {
    this.state = { ...this.state, msgCount: this.state.msgCount + 1 };
  }

  updateMsgRate(): void {
    const rate = this.state.msgCount;
    this.state = { ...this.state, msgRate: rate, msgCount: 0 };
    this.emitChange("msgRate", null, rate);
  }

  // ============================================================================
  // UI State (CRITICAL for modals)
  // ============================================================================

  setShowDetail(show: boolean): void {
    const previous = this.state.showDetail;
    this.state = { ...this.state, showDetail: show };
    this.emitChange("showDetail", previous, show);
  }

  toggleDetail(): void {
    this.setShowDetail(!this.state.showDetail);
  }

  setShowHelp(show: boolean): void {
    const previous = this.state.showHelp;
    this.state = { ...this.state, showHelp: show };
    this.emitChange("showHelp", previous, show);
  }

  toggleHelp(): void {
    this.setShowHelp(!this.state.showHelp);
  }

  closeAllModals(): void {
    if (this.state.showDetail || this.state.showHelp) {
      this.state = { ...this.state, showDetail: false, showHelp: false };
      this.emitChange("modals", true, false);
    }
  }

  // ============================================================================
  // Navigation Helpers
  // ============================================================================

  nextMarket(): boolean {
    if (this.state.radar.length === 0) {
      return false;
    }
    const maxIndex = this.state.radar.length - 1;
    const newIndex = Math.min(this.state.focusIndex + 1, maxIndex);
    if (newIndex !== this.state.focusIndex) {
      this.setFocusIndex(newIndex);
      return true;
    }
    return false;
  }

  previousMarket(): boolean {
    if (this.state.radar.length === 0) {
      return false;
    }
    const newIndex = Math.max(this.state.focusIndex - 1, 0);
    if (newIndex !== this.state.focusIndex) {
      this.setFocusIndex(newIndex);
      return true;
    }
    return false;
  }

  // ============================================================================
  // Reset
  // ============================================================================

  reset(): void {
    this.state = createDefaultState();
    this.emitChange("reset", null, null);
  }
}

// Singleton instance
export const stateManager = new StateManager();
