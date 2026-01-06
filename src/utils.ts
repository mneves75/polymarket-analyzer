export function formatPct(value?: number) {
  if (value === undefined) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPrice(value?: number) {
  if (value === undefined) return "-";
  return value.toFixed(4);
}

export function formatNumber(value?: number) {
  if (value === undefined) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(2);
}

export function asciiSparkline(series: number[], width = 30) {
  if (series.length === 0) return "(no data)";
  const levels = [".", ":", "-", "=", "+", "*", "#", "%", "@"];
  const sliced = series.slice(-width);
  const min = Math.min(...sliced);
  const max = Math.max(...sliced);
  const range = max - min || 1;
  return sliced
    .map((v) => {
      const idx = Math.floor(((v - min) / range) * (levels.length - 1));
      return levels[Math.max(0, Math.min(levels.length - 1, idx))];
    })
    .join("");
}

export function padRight(value: string, len: number) {
  if (value.length >= len) return value.slice(0, len);
  return value + " ".repeat(len - value.length);
}

export function midpointFrom(bestBid?: number, bestAsk?: number) {
  if (bestBid === undefined || bestAsk === undefined) return undefined;
  return (bestBid + bestAsk) / 2;
}
