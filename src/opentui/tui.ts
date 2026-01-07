/**
 * OpenTUI Dashboard Implementation
 * Complete rewrite with Enter key, modals, and full feature parity with blessed.
 *
 * WARNING: OpenTUI is NOT production-ready. Use Blessed for production.
 */

import {
  type CliRenderer,
  type KeyEvent,
  BoxRenderable,
  ScrollBoxRenderable,
  TextRenderable,
  bold,
  createCliRenderer,
  fg,
  t,
} from "@opentui/core";

import type { MarketInfo } from "../api.js";
import { loadRadar } from "../market.js";
import type { OrderbookState } from "../parsers.js";
import { generateDetailContent, generateHelpContent } from "../tui-modals.js";
import type { DashboardOptions, HealthScore } from "../tui-types.js";
import { formatNumber, formatPct, formatPrice, midpointFrom } from "../utils.js";
import { getConfig } from "./config.js";
import { logger } from "./logger.js";
import { type Result, ok } from "./result.js";
import { stateManager } from "./state/state-manager.js";
import type { CleanupHandler, DashboardState } from "./types.js";
import { validateDashboardOptions } from "./types.js";

// ============================================================================
// Signal Handlers & Cleanup
// ============================================================================

const cleanupHandlers: CleanupHandler[] = [];
let isShuttingDown = false;

function registerCleanup(fn: () => void | Promise<void>, priority = 10): void {
  cleanupHandlers.push({ cleanup: fn, priority });
  cleanupHandlers.sort((a, b) => a.priority - b.priority);
}

async function shutdown(signal: string): Promise<never> {
  if (isShuttingDown) {
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info("Shutting down", { signal });

  for (const { cleanup } of cleanupHandlers) {
    try {
      await cleanup();
    } catch (error) {
      // Log but don't throw - we're shutting down anyway
      logger.debug("Cleanup error during shutdown", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const exitCode = signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 0;
  process.exit(exitCode);
}

function setupSignalHandlers(): void {
  // Use once() for OS signals - auto-removes after first call, standard shutdown pattern
  const signals = ["SIGINT", "SIGTERM", "SIGQUIT"] as const;
  for (const signal of signals) {
    process.once(signal, () => shutdown(signal));
  }

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { message: error.message });
    shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
    shutdown("unhandledRejection");
  });
}

// ============================================================================
// Types
// ============================================================================

interface Panels {
  header: BoxRenderable;
  radarBox: ScrollBoxRenderable;
  marketBox: BoxRenderable;
  pulseBox: BoxRenderable;
  orderbookBox: BoxRenderable;
  historyBox: BoxRenderable;
  holdersBox: ScrollBoxRenderable;
  alertsBox: BoxRenderable;
  footer: BoxRenderable;
  detailModal: ScrollBoxRenderable;
  helpModal: BoxRenderable;
  mainContainer: BoxRenderable;
}

// ============================================================================
// Helper Functions
// ============================================================================

function computeHealthScore(state: DashboardState): HealthScore {
  const config = getConfig();

  if (state.noOrderbook) {
    return { score: 0, label: "N/A", color: config.colors.muted };
  }

  let score = 0;
  const spread =
    state.bestBid !== undefined && state.bestAsk !== undefined
      ? state.bestAsk - state.bestBid
      : undefined;

  const bidDepth = state.orderbook?.bids?.reduce((sum, l) => sum + l.size, 0) ?? 0;
  const askDepth = state.orderbook?.asks?.reduce((sum, l) => sum + l.size, 0) ?? 0;
  const totalDepth = bidDepth + askDepth;

  const focusMarket = stateManager.getFocusedMarket();
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
    score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
  const color =
    score >= 80
      ? config.colors.success
      : score >= 60
        ? config.colors.accent
        : score >= 40
          ? config.colors.warning
          : config.colors.error;

  return { score, label, color };
}

// ============================================================================
// Layout Creation
// ============================================================================

function createLayout(renderer: CliRenderer): Panels {
  const config = getConfig();

  // Main container
  const mainContainer = new BoxRenderable(renderer, {
    id: "main",
    flexGrow: 1,
    flexDirection: "column",
    backgroundColor: config.colors.background,
  });

  // Header
  const header = new BoxRenderable(renderer, {
    id: "header",
    height: config.layout.headerHeight,
    backgroundColor: config.colors.header,
  });
  header.add(
    new TextRenderable(renderer, {
      content: t`${bold("Polymarket Analyzer - OpenTUI Backend (EXPERIMENTAL)")}`,
    })
  );
  mainContainer.add(header);

  // Middle Section
  const middleSection = new BoxRenderable(renderer, {
    id: "middle-section",
    flexGrow: 1,
    flexDirection: "row",
  });

  // Left Column
  const leftColumn = new BoxRenderable(renderer, {
    id: "left-column",
    flexBasis: config.layout.leftColumnWidth,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "column",
  });

  // Radar
  const radarBox = new ScrollBoxRenderable(renderer, {
    id: "radar-box",
    scrollY: true,
    scrollX: false,
    flexGrow: 1,
    rootOptions: { borderStyle: "single", title: "Radar" },
  });
  leftColumn.add(radarBox);

  // Pulse
  const pulseBox = new BoxRenderable(renderer, {
    id: "pulse-box",
    height: config.layout.pulseHeight,
    borderStyle: "single",
  });
  leftColumn.add(pulseBox);

  // History
  const historyBox = new BoxRenderable(renderer, {
    id: "history-box",
    height: config.layout.historyHeight,
    borderStyle: "single",
  });
  leftColumn.add(historyBox);

  middleSection.add(leftColumn);

  // Right Column
  const rightColumn = new BoxRenderable(renderer, {
    id: "right-column",
    flexGrow: 1,
    flexDirection: "column",
  });

  // Market
  const marketBox = new BoxRenderable(renderer, {
    id: "market-box",
    height: config.layout.marketHeight,
    borderStyle: "single",
  });
  rightColumn.add(marketBox);

  // Orderbook
  const orderbookBox = new BoxRenderable(renderer, {
    id: "orderbook-box",
    height: config.layout.orderbookHeight,
    borderStyle: "single",
  });
  rightColumn.add(orderbookBox);

  // Holders
  const holdersBox = new ScrollBoxRenderable(renderer, {
    id: "holders-box",
    scrollY: true,
    scrollX: false,
    flexGrow: 1,
    rootOptions: { borderStyle: "single", title: "Holders" },
  });
  rightColumn.add(holdersBox);

  middleSection.add(rightColumn);
  mainContainer.add(middleSection);

  // Alerts
  const alertsBox = new BoxRenderable(renderer, {
    id: "alerts-box",
    height: config.layout.alertsHeight,
    borderStyle: "single",
  });
  mainContainer.add(alertsBox);

  // Footer
  const footer = new BoxRenderable(renderer, {
    id: "footer",
    height: config.layout.footerHeight,
    backgroundColor: config.colors.background,
  });
  footer.add(
    new TextRenderable(renderer, {
      content: t`${fg(config.colors.muted)("n/p:nav | j/k:scroll | Enter:detail | h:help | o:outcome | r:refresh | q:quit")}`,
    })
  );
  mainContainer.add(footer);

  renderer.root.add(mainContainer);

  // Detail Modal (hidden initially)
  const detailModal = new ScrollBoxRenderable(renderer, {
    id: "detail-modal",
    scrollY: true,
    scrollX: false,
    position: "absolute",
    top: 2,
    left: 5,
    right: 5,
    bottom: 2,
    rootOptions: {
      borderStyle: "single",
      title: "Market Detail",
      backgroundColor: config.colors.background,
    },
  });

  // Help Modal (hidden initially)
  const helpModal = new BoxRenderable(renderer, {
    id: "help-modal",
    position: "absolute",
    top: 5,
    left: 10,
    right: 10,
    bottom: 5,
    borderStyle: "single",
    backgroundColor: config.colors.background,
  });

  return {
    header,
    radarBox,
    marketBox,
    pulseBox,
    orderbookBox,
    historyBox,
    holdersBox,
    alertsBox,
    footer,
    detailModal,
    helpModal,
    mainContainer,
  };
}

// ============================================================================
// Panel Update Functions
// ============================================================================

function clearBox(box: BoxRenderable | ScrollBoxRenderable): void {
  const content = "content" in box ? box.content : box;
  try {
    const children = content.getChildren();
    for (const child of children) {
      content.remove(child.id);
    }
  } catch (error) {
    logger.debug("clearBox failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function updateRadarPanel(
  radarBox: ScrollBoxRenderable,
  renderer: CliRenderer,
  state: DashboardState
): void {
  const config = getConfig();

  try {
    clearBox(radarBox);

    // Header
    const header = new BoxRenderable(renderer, { flexDirection: "row", width: "100%" });
    header.add(
      new TextRenderable(renderer, {
        content: t`${bold("#")} ${bold("Heat")} ${bold("Event")} ${bold("Outcome")}`,
      })
    );
    radarBox.content.add(header);

    // Rows
    const maxRows = config.performance.maxRadarItems;
    const displayMarkets = state.radar.slice(0, maxRows);

    for (let i = 0; i < displayMarkets.length; i++) {
      const market = displayMarkets[i];
      if (!market) continue;

      const row = new BoxRenderable(renderer, { flexDirection: "row", width: "100%" });
      const isSelected = i === state.focusIndex;
      const question = market.question?.substring(0, 25) || "Unknown";
      const outcomeName = market.outcomes?.[state.outcomeIndex]?.substring(0, 12) || "-";

      const selectedColor = isSelected ? config.colors.selected : config.colors.text;
      const prefix = isSelected ? ">" : " ";

      row.add(
        new TextRenderable(renderer, {
          content: t`${fg(selectedColor)(`${prefix}${String(i).padStart(2, "0")}`)} ${question} ${fg(config.colors.accent)(outcomeName)}`,
        })
      );
      radarBox.content.add(row);
    }

    if (state.radar.length > maxRows) {
      radarBox.content.add(
        new TextRenderable(renderer, {
          content: t`${fg(config.colors.warning)(`... and ${state.radar.length - maxRows} more`)}`,
        })
      );
    }
  } catch (error) {
    logger.debug("updateRadarPanel failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function updateMarketPanel(
  marketBox: BoxRenderable,
  renderer: CliRenderer,
  state: DashboardState
): void {
  const config = getConfig();
  const focusMarket = stateManager.getFocusedMarket();

  try {
    clearBox(marketBox);

    if (!focusMarket) {
      marketBox.add(
        new TextRenderable(renderer, {
          content: t`${fg(config.colors.muted)("No market selected")}`,
        })
      );
      return;
    }

    const tokenId =
      focusMarket.clobTokenIds[state.outcomeIndex] ?? focusMarket.clobTokenIds[0];
    const outcome = focusMarket.outcomes[state.outcomeIndex] || `OUTCOME_${state.outcomeIndex + 1}`;

    marketBox.add(
      new TextRenderable(renderer, {
        content: t`${bold("Market")}`,
      })
    );

    marketBox.add(
      new TextRenderable(renderer, {
        content: t`${fg(config.colors.muted)("Q:")} ${focusMarket.question?.substring(0, 50) || "Unknown"}`,
      })
    );

    marketBox.add(
      new TextRenderable(renderer, {
        content: t`${fg(config.colors.muted)("Outcome:")} ${outcome} (${state.outcomeIndex + 1}/${focusMarket.clobTokenIds.length})`,
      })
    );

    marketBox.add(
      new TextRenderable(renderer, {
        content: t`${fg(config.colors.muted)("Token:")} ${tokenId?.substring(0, 20) || "-"}...`,
      })
    );

    const bid = state.bestBid ?? focusMarket.bestBid;
    const ask = state.bestAsk ?? focusMarket.bestAsk;

    marketBox.add(
      new TextRenderable(renderer, {
        content: t`${bold("Bid:")} ${fg(config.colors.success)(formatPrice(bid))} ${bold("Ask:")} ${fg(config.colors.error)(formatPrice(ask))}`,
      })
    );
  } catch (error) {
    logger.debug("updateMarketPanel failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function updatePulsePanel(
  pulseBox: BoxRenderable,
  renderer: CliRenderer,
  state: DashboardState
): void {
  const config = getConfig();

  try {
    clearBox(pulseBox);

    pulseBox.add(new TextRenderable(renderer, { content: t`${bold("Pulse")}` }));

    const spread =
      state.bestBid !== undefined && state.bestAsk !== undefined
        ? state.bestAsk - state.bestBid
        : undefined;

    pulseBox.add(
      new TextRenderable(renderer, {
        content: t`${fg(config.colors.muted)("Bid:")} ${fg(config.colors.success)(formatPrice(state.bestBid))} ${fg(config.colors.muted)("Ask:")} ${fg(config.colors.error)(formatPrice(state.bestAsk))}`,
      })
    );

    pulseBox.add(
      new TextRenderable(renderer, {
        content: t`${fg(config.colors.muted)("Spread:")} ${formatPrice(spread)} ${fg(config.colors.muted)("Mid:")} ${fg(config.colors.accent)(formatPrice(state.midpoint))}`,
      })
    );

    const health = computeHealthScore(state);
    pulseBox.add(
      new TextRenderable(renderer, {
        content: t`${fg(config.colors.muted)("Health:")} ${fg(health.color)(`${health.label} (${health.score})`)}`,
      })
    );
  } catch (error) {
    logger.debug("updatePulsePanel failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function updateOrderbookPanel(
  orderbookBox: BoxRenderable,
  renderer: CliRenderer,
  state: DashboardState
): void {
  const config = getConfig();

  try {
    clearBox(orderbookBox);

    orderbookBox.add(new TextRenderable(renderer, { content: t`${bold("Orderbook")}` }));

    const bids = state.orderbook?.bids ?? [];
    const asks = state.orderbook?.asks ?? [];

    orderbookBox.add(
      new TextRenderable(renderer, {
        content: t`${fg(config.colors.success)("BID")}      ${fg(config.colors.muted)("SIZE")}    ${fg(config.colors.error)("ASK")}      ${fg(config.colors.muted)("SIZE")}`,
      })
    );

    for (let i = 0; i < 3; i++) {
      const bid = bids[i];
      const ask = asks[i];
      orderbookBox.add(
        new TextRenderable(renderer, {
          content: t`${formatPrice(bid?.price).padEnd(8)} ${formatNumber(bid?.size).padEnd(8)} ${formatPrice(ask?.price).padEnd(8)} ${formatNumber(ask?.size)}`,
        })
      );
    }
  } catch (error) {
    logger.debug("updateOrderbookPanel failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function updateHistoryPanel(
  historyBox: BoxRenderable,
  renderer: CliRenderer,
  state: DashboardState
): void {
  const config = getConfig();

  try {
    clearBox(historyBox);

    historyBox.add(new TextRenderable(renderer, { content: t`${bold("History")}` }));

    if (state.historySeries.length === 0) {
      historyBox.add(
        new TextRenderable(renderer, {
          content: t`${fg(config.colors.muted)("No history data")}`,
        })
      );
    } else {
      const last = state.historySeries.at(-1);
      historyBox.add(
        new TextRenderable(renderer, {
          content: t`${fg(config.colors.muted)("Points:")} ${state.historySeries.length} ${fg(config.colors.muted)("Last:")} ${fg(config.colors.accent)(formatPrice(last))}`,
        })
      );
    }
  } catch (error) {
    logger.debug("updateHistoryPanel failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function updateAlertsPanel(
  alertsBox: BoxRenderable,
  renderer: CliRenderer,
  state: DashboardState
): void {
  const config = getConfig();

  try {
    clearBox(alertsBox);

    alertsBox.add(new TextRenderable(renderer, { content: t`${bold("Alerts & Status")}` }));

    const wsStatusColor =
      state.wsStatus === "connected"
        ? config.colors.success
        : state.wsStatus === "connecting"
          ? config.colors.warning
          : config.colors.error;

    alertsBox.add(
      new TextRenderable(renderer, {
        content: t`${fg(config.colors.muted)("WS:")} ${fg(wsStatusColor)(state.wsStatus.toUpperCase())} ${fg(config.colors.muted)("Markets:")} ${state.radar.length}`,
      })
    );

    if (state.lastAlert) {
      alertsBox.add(
        new TextRenderable(renderer, {
          content: t`${fg(config.colors.warning)("Alert:")} ${state.lastAlert.substring(0, 50)}`,
        })
      );
    }
  } catch (error) {
    logger.debug("updateAlertsPanel failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function updateDetailModal(
  detailModal: ScrollBoxRenderable,
  renderer: CliRenderer,
  state: DashboardState
): void {
  const config = getConfig();

  try {
    clearBox(detailModal);

    const focusMarket = stateManager.getFocusedMarket();

    const content = generateDetailContent({
      focusMarket,
      outcomeIndex: state.outcomeIndex,
      bestBid: state.bestBid,
      bestAsk: state.bestAsk,
      midpoint: state.midpoint,
      lastTrade: state.lastTrade,
      noOrderbook: state.noOrderbook,
      orderbook: state.orderbook,
      historySeries: state.historySeries,
      healthScore: computeHealthScore(state),
    });

    // Split content into lines and add as text renderables
    // Note: blessed tags won't work directly, we simplify here
    const maxModalLines = getConfig().performance.maxRadarItems; // Reuse config
    const lines = content.split("\n");
    for (const line of lines.slice(0, maxModalLines)) {
      detailModal.content.add(
        new TextRenderable(renderer, {
          content: t`${line.replace(/\{[^}]+\}/g, "")}`, // Strip blessed tags
        })
      );
    }
  } catch (error) {
    logger.debug("updateDetailModal failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function updateHelpModal(
  helpModal: BoxRenderable,
  renderer: CliRenderer,
  state: DashboardState
): void {
  try {
    clearBox(helpModal);

    const content = generateHelpContent({
      autoSkipNoOrderbook: state.autoSkipNoOrderbook,
      priceAlertHigh: state.priceAlertHigh,
      priceAlertLow: state.priceAlertLow,
    });

    const maxHelpLines = Math.min(getConfig().performance.maxRadarItems, 30);
    const lines = content.split("\n");
    for (const line of lines.slice(0, maxHelpLines)) {
      helpModal.add(
        new TextRenderable(renderer, {
          content: t`${line.replace(/\{[^}]+\}/g, "")}`, // Strip blessed tags
        })
      );
    }
  } catch (error) {
    logger.debug("updateHelpModal failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

// ============================================================================
// Render All
// ============================================================================

function renderAll(panels: Panels, renderer: CliRenderer): void {
  const state = stateManager.get();

  updateRadarPanel(panels.radarBox, renderer, state);
  updateMarketPanel(panels.marketBox, renderer, state);
  updatePulsePanel(panels.pulseBox, renderer, state);
  updateOrderbookPanel(panels.orderbookBox, renderer, state);
  updateHistoryPanel(panels.historyBox, renderer, state);
  updateAlertsPanel(panels.alertsBox, renderer, state);

  // Handle modals
  if (state.showDetail) {
    updateDetailModal(panels.detailModal, renderer, state);
    if (!panels.mainContainer.getChildren().find((c) => c.id === "detail-modal")) {
      panels.mainContainer.add(panels.detailModal);
    }
  } else {
    try {
      panels.mainContainer.remove("detail-modal");
    } catch (error) {
      // Modal not present - expected during normal operation
      logger.debug("detail-modal not present for removal");
    }
  }

  if (state.showHelp) {
    updateHelpModal(panels.helpModal, renderer, state);
    if (!panels.mainContainer.getChildren().find((c) => c.id === "help-modal")) {
      panels.mainContainer.add(panels.helpModal);
    }
  } else {
    try {
      panels.mainContainer.remove("help-modal");
    } catch (error) {
      // Modal not present - expected during normal operation
      logger.debug("help-modal not present for removal");
    }
  }

  renderer.requestRender();
}

// ============================================================================
// Keyboard Handler
// ============================================================================

function setupKeyboard(renderer: CliRenderer, panels: Panels, limit: number): void {
  const handler = renderer.keyInput;

  handler.on("keypress", async (key: KeyEvent) => {
    const state = stateManager.get();

    try {
      // Quit - always works
      if (key.name === "q" || (key.name === "c" && key.ctrl)) {
        await shutdown("user");
        return;
      }

      // CRITICAL: Enter key handler for detail modal
      if (key.name === "return" || key.name === "enter") {
        if (state.showHelp) {
          stateManager.setShowHelp(false);
        } else {
          stateManager.toggleDetail();
        }
        renderAll(panels, renderer);
        return;
      }

      // Escape - close modals
      if (key.name === "escape") {
        if (state.showDetail) {
          stateManager.setShowDetail(false);
          renderAll(panels, renderer);
          return;
        }
        if (state.showHelp) {
          stateManager.setShowHelp(false);
          renderAll(panels, renderer);
          return;
        }
        return;
      }

      // Help modal
      if (key.name === "h" && !state.showDetail) {
        stateManager.toggleHelp();
        renderAll(panels, renderer);
        return;
      }

      // If modal is open, don't process other keys
      if (state.showDetail || state.showHelp) {
        // Modal scroll
        if (key.name === "j" || key.name === "down") {
          if (state.showDetail) {
            panels.detailModal.scrollBy(1);
          }
          return;
        }
        if (key.name === "k" || key.name === "up") {
          if (state.showDetail) {
            panels.detailModal.scrollBy(-1);
          }
          return;
        }
        return;
      }

      // Navigation
      switch (key.name) {
        case "n": {
          if (stateManager.nextMarket()) {
            stateManager.setOutcomeIndex(0);
            renderAll(panels, renderer);
          }
          break;
        }

        case "p": {
          if (stateManager.previousMarket()) {
            stateManager.setOutcomeIndex(0);
            renderAll(panels, renderer);
          }
          break;
        }

        case "j":
        case "down":
          panels.radarBox.scrollBy(1);
          break;

        case "k":
        case "up":
          panels.radarBox.scrollBy(-1);
          break;

        case "o": {
          stateManager.toggleOutcome();
          renderAll(panels, renderer);
          break;
        }

        case "a": {
          stateManager.toggleAutoSkipNoOrderbook();
          const skipState = stateManager.get().autoSkipNoOrderbook;
          stateManager.setLastAlert(skipState ? "Auto-skip enabled" : "Auto-skip disabled");
          renderAll(panels, renderer);
          break;
        }

        case "r": {
          stateManager.setLoading(true);
          stateManager.setLastAlert("Refreshing...");
          renderAll(panels, renderer);

          try {
            const radar = await loadRadar(limit);
            stateManager.setRadar(radar);
            stateManager.updateLastRestAt();
            stateManager.setLastAlert("Refreshed");
          } catch (err) {
            stateManager.setLastAlert(`Refresh error: ${err instanceof Error ? err.message : String(err)}`);
          }

          stateManager.setLoading(false);
          renderAll(panels, renderer);
          break;
        }
      }
    } catch (error) {
      logger.error("Keyboard handler error", {
        key: key.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  registerCleanup(() => {
    handler.removeAllListeners();
  }, 20);
}

// ============================================================================
// Main Entry Point
// ============================================================================

export async function runDashboard(options: DashboardOptions): Promise<void> {
  setupSignalHandlers();

  // Validate options early
  const validatedOptions = validateDashboardOptions({
    limit: options.limit,
    slug: options.slug,
    market: options.market,
    intervalMs: options.intervalMs,
    ws: options.ws,
  });

  logger.info("Starting dashboard", { options: validatedOptions });

  let renderer: CliRenderer | null = null;

  try {
    const config = getConfig();
    renderer = await createCliRenderer({
      exitOnCtrlC: false,
      useAlternateScreen: true,
      targetFps: config.performance.targetFps,
      backgroundColor: config.colors.background,
    });

    registerCleanup(() => {
      if (renderer) {
        renderer.destroy();
      }
    }, 10);

    const panels = createLayout(renderer);

    // Fetch initial data
    stateManager.setLoading(true);
    try {
      const radar = await loadRadar(validatedOptions.limit);
      stateManager.setRadar(radar);
      stateManager.updateLastRestAt();
      logger.info("Initial data loaded", { count: radar.length });
    } catch (err) {
      stateManager.setError(err instanceof Error ? err.message : String(err));
      logger.error("Failed to load initial data", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    stateManager.setLoading(false);

    // Setup keyboard
    setupKeyboard(renderer, panels, validatedOptions.limit);

    // Initial render
    renderAll(panels, renderer);

    // Listen for state changes with debouncing to prevent CPU thrashing
    let renderTimeout: ReturnType<typeof setTimeout> | null = null;
    const debouncedRender = () => {
      if (renderTimeout) {
        clearTimeout(renderTimeout);
      }
      renderTimeout = setTimeout(() => {
        if (renderer && !isShuttingDown) {
          renderAll(panels, renderer);
        }
      }, getConfig().performance.renderDebounceMs);
    };

    stateManager.on("change", debouncedRender);

    // Register cleanup for state listener
    registerCleanup(() => {
      stateManager.removeListener("change", debouncedRender);
      if (renderTimeout) {
        clearTimeout(renderTimeout);
      }
    }, 15);

    // Start renderer
    renderer.start();

    logger.info("OpenTUI dashboard started");
  } catch (error) {
    logger.error("Failed to start TUI", {
      error: error instanceof Error ? error.message : String(error),
    });
    await shutdown("init_error");
  }
}

// Re-export for external use
export { stateManager };
