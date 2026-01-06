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

export function asciiChart(series: number[], width = 50, height = 8): string[] {
	if (series.length === 0) return ["(no data)"];

	const sliced = series.slice(-width);
	const min = Math.min(...sliced);
	const max = Math.max(...sliced);
	const isConstant = max === min;

	// For very few points, a chart isn't meaningful
	if (sliced.length < 3) {
		const value = sliced[sliced.length - 1] ?? 0;
		return [
			`Price: ${formatPrice(value)} (${sliced.length} point${sliced.length === 1 ? "" : "s"} - insufficient for chart)`,
		];
	}

	const lines: string[] = [];
	const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

	// Handle constant values - show flat line with label
	if (isConstant) {
		const midRow = Math.floor(height / 2);
		for (let row = height - 1; row >= 0; row--) {
			const rowChars: string[] = [];
			for (let i = 0; i < sliced.length; i++) {
				if (row === midRow) {
					rowChars.push("─");
				} else {
					rowChars.push(" ");
				}
			}
			const label = row === midRow ? formatPrice(min) : "";
			lines.push(`${label.padStart(7)} │${rowChars.join("")}`);
		}
		lines.push(`${"".padStart(7)} └${"─".repeat(sliced.length)}`);
		lines.push(`${"".padStart(7)}  (stable price - no variation)`);
		return lines;
	}

	// Normal case - values have range
	const range = max - min;

	// Create the chart rows (top to bottom)
	for (let row = height - 1; row >= 0; row--) {
		const rowChars: string[] = [];

		for (const val of sliced) {
			const normalized = (val - min) / range;
			const fillLevel = normalized * height;

			if (fillLevel >= row + 1) {
				rowChars.push("█");
			} else if (fillLevel > row) {
				const partialIdx = Math.floor((fillLevel - row) * blocks.length);
				const block = blocks[Math.min(partialIdx, blocks.length - 1)];
				rowChars.push(block ?? " ");
			} else {
				rowChars.push(" ");
			}
		}

		const label =
			row === height - 1 ? formatPrice(max) : row === 0 ? formatPrice(min) : "";
		lines.push(`${label.padStart(7)} │${rowChars.join("")}`);
	}

	// Add bottom axis
	lines.push(`${"".padStart(7)} └${"─".repeat(sliced.length)}`);

	return lines;
}

export function padRight(value: string, len: number) {
	if (value.length >= len) return value.slice(0, len);
	return value + " ".repeat(len - value.length);
}

export function midpointFrom(bestBid?: number, bestAsk?: number) {
	if (bestBid === undefined || bestAsk === undefined) return undefined;
	return (bestBid + bestAsk) / 2;
}
