/**
 * Configuration for OpenTUI layout and colors.
 * Centralizes magic numbers and theme settings.
 */

export interface TUILayoutConfig {
  headerHeight: number;
  footerHeight: number;
  leftColumnWidth: number;
  radarWidth: number;
  marketWidth: number;
  radarMinHeight: number;
  pulseHeight: number;
  historyHeight: number;
  marketHeight: number;
  orderbookHeight: number;
  alertsHeight: number;
}

export interface TUIColorConfig {
  background: string;
  header: string;
  selected: string;
  text: string;
  success: string;
  error: string;
  warning: string;
  muted: string;
  accent: string;
  border: string;
  bid: string;
  ask: string;
}

export interface TUIPerformanceConfig {
  targetFps: number;
  debounceMs: number;
  renderDebounceMs: number;
  maxRadarItems: number;
  virtualScrollThreshold: number;
  cacheExpiryMs: number;
}

export interface TUIConfig {
  layout: TUILayoutConfig;
  colors: TUIColorConfig;
  performance: TUIPerformanceConfig;
}

/**
 * Default configuration matching blessed THEME
 */
export const DEFAULT_CONFIG: TUIConfig = {
  layout: {
    headerHeight: 1,
    footerHeight: 1,
    leftColumnWidth: 40,
    radarWidth: 40,
    marketWidth: 60,
    radarMinHeight: 10,
    pulseHeight: 7,
    historyHeight: 7,
    marketHeight: 10,
    orderbookHeight: 7,
    alertsHeight: 7,
  },
  colors: {
    background: "#000000",
    header: "white",
    selected: "yellow",
    text: "#FFFFFF",
    success: "#00FF00",
    error: "#FF0000",
    warning: "#FFFF00",
    muted: "#666666",
    accent: "#FF00FF",
    border: "blue",
    bid: "green",
    ask: "red",
  },
  performance: {
    targetFps: 30,
    debounceMs: 100,
    renderDebounceMs: 16,
    maxRadarItems: 100,
    virtualScrollThreshold: 100,
    cacheExpiryMs: 30_000,
  },
};

// Mutable config instance for runtime updates
// Deep copy to avoid sharing nested objects with DEFAULT_CONFIG
let currentConfig: TUIConfig = {
  layout: { ...DEFAULT_CONFIG.layout },
  colors: { ...DEFAULT_CONFIG.colors },
  performance: { ...DEFAULT_CONFIG.performance },
};

/**
 * Get the current configuration
 */
export function getConfig(): TUIConfig {
  return currentConfig;
}

/**
 * Update configuration with partial values
 */
export function updateConfig(partial: {
  layout?: Partial<TUILayoutConfig>;
  colors?: Partial<TUIColorConfig>;
  performance?: Partial<TUIPerformanceConfig>;
}): void {
  if (partial.layout) {
    currentConfig = {
      ...currentConfig,
      layout: { ...currentConfig.layout, ...partial.layout },
    };
  }
  if (partial.colors) {
    currentConfig = {
      ...currentConfig,
      colors: { ...currentConfig.colors, ...partial.colors },
    };
  }
  if (partial.performance) {
    currentConfig = {
      ...currentConfig,
      performance: { ...currentConfig.performance, ...partial.performance },
    };
  }
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  currentConfig = {
    layout: { ...DEFAULT_CONFIG.layout },
    colors: { ...DEFAULT_CONFIG.colors },
    performance: { ...DEFAULT_CONFIG.performance },
  };
}

/**
 * Get a specific color from the theme
 */
export function getColor(key: keyof TUIColorConfig): string {
  return currentConfig.colors[key];
}

/**
 * Get a layout dimension
 */
export function getLayoutDimension(key: keyof TUILayoutConfig): number {
  return currentConfig.layout[key];
}
