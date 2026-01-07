/**
 * Market service with caching for API calls.
 * Separates data fetching from UI logic.
 */

import type { MarketInfo } from "../../api.js";
import { loadRadar, resolveMarket } from "../../market.js";
import type { DashboardOptions } from "../../tui-types.js";
import { getConfig } from "../config.js";
import { DataError, NetworkError } from "../errors.js";
import { logger } from "../logger.js";
import { type Result, err, ok } from "../result.js";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Market service with caching
 */
class MarketService {
  private radarCache: CacheEntry<MarketInfo[]> | null = null;

  /**
   * Get radar markets with caching
   */
  async getRadar(limit: number): Promise<Result<MarketInfo[], NetworkError | DataError>> {
    const now = Date.now();
    const config = getConfig(); // Get fresh config on each call

    // Check cache
    if (
      this.radarCache &&
      now - this.radarCache.timestamp < config.performance.cacheExpiryMs
    ) {
      logger.debug("Radar cache hit", { cacheAge: now - this.radarCache.timestamp });
      return ok(this.radarCache.data);
    }

    logger.debug("Fetching radar data", { limit });

    try {
      const markets = await loadRadar(limit);

      // Validate response
      if (!Array.isArray(markets)) {
        return err(new DataError("Invalid API response: not an array", {
          type: typeof markets,
        }));
      }

      // Update cache
      this.radarCache = {
        data: markets,
        timestamp: now,
      };

      logger.info("Radar data fetched", { count: markets.length });
      return ok(markets);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to fetch radar", { error: message });
      return err(new NetworkError(`Failed to load radar: ${message}`, { limit }));
    }
  }

  /**
   * Resolve market from options
   */
  async resolveMarket(
    options: DashboardOptions,
    radar: MarketInfo[]
  ): Promise<Result<MarketInfo | null, NetworkError>> {
    try {
      const market = await resolveMarket(options, radar);
      return ok(market);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to resolve market", { error: message });
      return err(new NetworkError(`Failed to resolve market: ${message}`));
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.radarCache = null;
    logger.debug("Cache cleared");
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { hasRadar: boolean; radarAge: number | null } {
    const now = Date.now();
    return {
      hasRadar: this.radarCache !== null,
      radarAge: this.radarCache ? now - this.radarCache.timestamp : null,
    };
  }
}

// Singleton instance
export const marketService = new MarketService();
