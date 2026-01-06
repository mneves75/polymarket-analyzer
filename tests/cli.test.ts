import { describe, expect, it } from "bun:test";

async function run(args: string[]) {
	const proc = Bun.spawn({
		cmd: ["bun", "run", "src/index.ts", ...args],
		stdout: "pipe",
		stderr: "pipe",
	});
	const output = await new Response(proc.stdout).text();
	return output;
}

describe("cli", () => {
	it("prints help", async () => {
		const out = await run(["--help"]);
		expect(out).toContain("Polymarket TUI Demo");
		expect(out).toContain("--list-markets");
	});
});
