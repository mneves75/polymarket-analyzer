# Polymarket Analyzer - Troubleshooting Guide

This guide provides comprehensive troubleshooting steps for common issues encountered when using the polymarket-analyzer.

## Table of Contents

- [Installation Issues](#installation-issues)
- [API Connection Problems](#api-connection-problems)
- [WebSocket Issues](#websocket-issues)
- [Rate Limiting Errors](#rate-limiting-errors)
- [Market Data Issues](#market-data-issues)
- [TUI/Display Problems](#tuidisplay-problems)
- [Performance Issues](#performance-issues)
- [Testing Issues](#testing-issues)
- [When to Escalate](#when-to-escalate)

---

## Installation Issues

### Error: "Cannot find module 'blessed'"

**Symptoms:**
```
Error: Cannot find module 'blessed'
```

**Diagnosis:** Dependencies not installed or node_modules missing.

**Solution:**
```bash
rm -rf node_modules
bun install
```

**Verification:**
```bash
bun test  # Should run without module errors
```

---

### Error: "Bun version too old"

**Symptoms:**
```
Error: This project requires Bun 1.3.5 or later
```

**Diagnosis:** Outdated Bun version.

**Solution:**
```bash
bun upgrade  # Or reinstall from https://bun.sh
```

**Verification:**
```bash
bun --version  # Should be 1.3.5 or higher
```

---

## API Connection Problems

### Error: "fetch failed" / ECONNREFUSED

**Symptoms:**
```
Error: fetch failed
  at fetchJson (src/http.ts:XXX)
```

**Diagnosis:** No internet connection or Polymarket API is down.

**Solutions:**

1. **Check internet connection:**
```bash
ping gamma-api.polymarket.com
ping clob.polymarket.com
```

2. **Verify API status:**
   - Check https://status.polymarket.com
   - Try accessing API URLs directly in browser

3. **Check for proxy/firewall issues:**
```bash
# Test with curl
curl -I https://gamma-api.polymarket.com/markets?limit=1
```

4. **Disable VPN if using:**
   - Some VPNs block API connections
   - Try without VPN

---

### Error: HTTP 429 "Too Many Requests"

**Symptoms:**
```
HTTP 429 Too Many Requests for https://clob.polymarket.com/...
```

**Diagnosis:** Hit rate limit. Application handles this automatically with retries.

**What's Happening:**
- Application is retrying with exponential backoff
- Tokens are being consumed from the rate limiter bucket
- Requests will resume when bucket refills

**Solutions:**

1. **Wait for automatic retry:**
   - Retries happen automatically (no action needed)
   - Wait ~10 seconds for rate limit window to reset

2. **Reduce request frequency:**
   - Fewer markets in radar
   - Increase refresh intervals in TUI

3. **Check rate limit configuration:**
   - Verify `src/http.ts` RATE_LIMITS are correct
   - Current limits are documented in source code

---

### Error: HTTP 404 "No orderbook exists"

**Symptoms:**
```
HTTP 404 for https://clob.polymarket.com/midpoint...
Error: No orderbook exists for the requested token id
```

**Diagnosis:** Market has no active orderbook (normal state for new/inactive markets).

**What's Happening:**
- This is a **normal condition**, not an error
- Not all markets have active trading
- Application handles this gracefully

**Solutions:**

1. **Use auto-skip feature:**
   - Press `a` in TUI to toggle auto-skip
   - Skips markets without orderbooks when navigating

2. **Select a different market:**
   - Press `n`/`p` to find markets with active orderbooks
   - Markets with `(O)` indicator have no orderbook

3. **Verify with market list:**
```bash
bun --bun run dev --list-markets
# Look for markets with high volume
```

---

## WebSocket Issues

### Error: "WebSocket connection failed"

**Symptoms:**
```
ws parse error: WebSocket connection failed
status: error
```

**Diagnosis:** Cannot connect to Polymarket WebSocket server.

**Solutions:**

1. **Check WebSocket URL in config:**
```typescript
// src/config.ts
clobWsBase: "wss://clob.polymarket.com/ws"
```

2. **Test WebSocket manually:**
```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c wss://clob.polymarket.com/ws
```

3. **Check for firewall blocking WebSocket:**
   - Port 443 (wss://) must be open
   - Some corporate networks block WebSocket

4. **Verify reconnection is working:**
   - Application should auto-reconnect
   - Look for "reconnecting" status in TUI

---

### Issue: "WebSocket not receiving updates"

**Symptoms:**
- WebSocket shows "connected" status
- Prices not updating in real-time
- Orderbook stays static

**Diagnosis:** Connected but not subscribed to market data.

**Solutions:**

1. **Verify subscription was sent:**
   - Check TUI footer for "subscribed" message
   - Asset IDs must match Polymarket token IDs

2. **Check asset ID format:**
```typescript
// Correct: 0x... hex string
assetIds: ["0x1234567890abcdef..."]

// Incorrect: numeric IDs
assetIds: [12345]  // Wrong!
```

3. **Test with known market:**
```bash
bun --bun run dev --slug trump-2024  # Use known active market
```

4. **Restart TUI:**
   - Press `r` to manually refresh
   - Exit and restart application

---

### Issue: "WebSocket keeps reconnecting"

**Symptoms:**
- Status shows "reconnecting" repeatedly
- Connection drops frequently
- Never stabilizes on "connected"

**Diagnosis:** Connection unstable or being rejected.

**Solutions:**

1. **Check network stability:**
```bash
# Run continuous ping
ping -i 1 clob.polymarket.com
```

2. **Verify backoff is working:**
   - Application uses exponential backoff
   - Wait times: 500ms -> 1000ms -> 2000ms -> max 30000ms
   - If reconnecting too fast, backoff may not be working

3. **Check for rate limiting:**
   - WebSocket rate limits are different from REST
   - Too many subscription attempts can trigger bans

4. **Reduce WebSocket load:**
   - Subscribe to fewer markets
   - Increase heartbeat interval

---

## Rate Limiting Errors

### Error: "Rate limit exceeded for endpoint"

**Symptoms:**
```
Error: Rate limit exceeded for endpoint /markets
```

**Diagnosis:** Token bucket is empty, waiting for refill.

**What's Happening:**
- Each endpoint has a rate limit (e.g., 300 req/10s)
- Application respects these limits automatically
- Requests wait when bucket is empty

**Solutions:**

1. **Wait for automatic retry:**
   - Application retries automatically with backoff
   - No manual intervention needed

2. **Check rate limit configuration:**
```typescript
// src/http.ts - Verify these are current
const RATE_LIMITS = [
  { host: "gamma-api.polymarket.com", path: "/markets", limit: 300 },
  // ... other limits
];
```

3. **Monitor rate limit usage:**
```bash
# Enable debug logging
TUI_MODE=true bun --bun run dev --tui
# Watch for "Rate limit" messages
```

---

## Market Data Issues

### Issue: "Markets not loading"

**Symptoms:**
- Radar panel shows "No markets"
- Error: "Failed to fetch markets"
- Empty market list

**Diagnosis:** Gamma API not returning data.

**Solutions:**

1. **Test API directly:**
```bash
curl "https://gamma-api.polymarket.com/markets?limit=5&closed=false&active=true"
```

2. **Check API URL in config:**
```typescript
// src/config.ts
gammaBase: "https://gamma-api.polymarket.com"
```

3. **Try with different parameters:**
```bash
bun --bun run dev --list-markets
bun --bun run dev --list-markets --json
```

4. **Check for API changes:**
   - Polymarket may have changed API response format
   - Compare with API documentation: https://docs.polymarket.com

---

### Issue: "Incorrect prices displayed"

**Symptoms:**
- Prices don't match Polymarket website
- Price stuck at old value
- YES/NO prices don't sum to ~1.00

**Diagnosis:** Price calculation or data source issue.

**Solutions:**

1. **Verify price source:**
   - TUI shows both WebSocket (real-time) and REST (cached) prices
   - WebSocket prices are more current

2. **Check midpoint calculation:**
```typescript
// src/utils.ts
export function midpointFrom(bid?: number, ask?: number): number | undefined {
  if (!bid || !ask) return undefined;
  return (bid + ask) / 2;
}
```

3. **Refresh data:**
   - Press `r` to manually refresh
   - Wait for WebSocket update

4. **Cross-reference with website:**
   - Compare with https://polymarket.com
   - Small differences are normal (timing/stale data)

---

### Issue: "No orderbook data"

**Symptoms:**
- Orderbook panel shows "No orderbook"
- Cannot see bids/asks
- Error: "No orderbook exists for token"

**Diagnosis:** Market has no active orderbook (normal for some markets).

**Solutions:**

1. **Verify this is expected:**
   - New markets often start without orderbooks
   - Inactive markets may have empty orderbooks

2. **Use auto-skip:**
   - Press `a` to toggle auto-skip
   - Automatically skips markets without orderbooks

3. **Try a different market:**
   - Use `n`/`p` to navigate
   - Look for markets with high volume (likely to have orderbooks)

---

## TUI/Display Problems

### Issue: "TUI display is garbled"

**Symptoms:**
- Lines not aligned properly
- Text overlapping
- Strange characters

**Diagnosis:** Terminal size or font issue.

**Solutions:**

1. **Increase terminal size:**
   - Minimum: 80 columns x 24 rows
   - Recommended: 120 columns x 40 rows

2. **Use monospace font:**
   - Terminal must use monospace font
   - Examples: Courier, Consolas, Monaco, SF Mono

3. **Disable Unicode (if having issues):**
```bash
export LANG=C
bun --bun run dev --tui
```

4. **Try different terminal:**
   - macOS: Terminal.app, iTerm2
   - Linux: gnome-terminal, kitty
   - Windows: Windows Terminal, PowerShell

---

### Issue: "TUI not responding to keyboard"

**Symptoms:**
- Pressing keys does nothing
- Cannot navigate markets
- Keyboard shortcuts not working

**Diagnosis:** Focus or key binding issue.

**Solutions:**

1. **Ensure TUI has focus:**
   - Click on terminal window
   - Ensure no modal is blocking input

2. **Check for help modal:**
   - Press `ESC` to close any open modals
   - Help modal (`h` or `?`) blocks input

3. **Try different keys:**
   - `n`/`p` - Next/previous market
   - `o` - Toggle outcome (YES/NO)
   - `r` - Refresh
   - `q` - Quit

4. **Restart TUI:**
   - Press `q` to quit
   - Run `bun --bun run dev --tui` again

---

### Issue: "TUI is slow/laggy"

**Symptoms:**
- Delayed response to key presses
- Screen updates take long time
- Cursor stutters

**Diagnosis:** Too much data or slow API calls.

**Solutions:**

1. **Reduce number of markets:**
   - Radar refresh interval: 60 seconds (default)
   - Fewer markets = faster updates

2. **Check network latency:**
```bash
ping clob.polymarket.com
# High latency causes slow TUI
```

3. **Disable auto-refresh temporarily:**
   - Manual refresh with `r` when needed
   - Reduces background API calls

4. **Close detail modal if open:**
   - Detail screen fetches additional data
   - Press `ESC` to close

---

## Performance Issues

### Issue: "High CPU usage"

**Symptoms:**
- Terminal process uses high CPU
- Fan spins loudly
- System becomes sluggish

**Diagnosis:** Inefficient rendering or API polling.

**Solutions:**

1. **Check refresh intervals:**
```typescript
// src/tui.ts - Verify these are reasonable
const RADAR_REFRESH_MS = 60000;   // 60 seconds
const ORDERBOOK_REFRESH_MS = 3000; // 3 seconds
```

2. **Profile the application:**
```bash
# Bun profiler
bun --profile run dev --tui
# Analyze the generated profile
```

3. **Reduce concurrent requests:**
   - Each panel makes independent API calls
   - Consider combining requests

4. **Enable TUI mode for better rendering:**
```bash
TUI_MODE=true bun --bun run dev --tui
```

---

### Issue: "Memory leak"

**Symptoms:**
- Memory usage grows over time
- Application slows down after extended use
- Eventual crash

**Diagnosis:** Uncleaned event listeners or timers.

**Solutions:**

1. **Check for timer cleanup:**
```typescript
// Ensure all timers are cleared
const interval = setInterval(...);
// Later:
clearInterval(interval);
```

2. **Verify WebSocket cleanup:**
```typescript
// When closing TUI
ws.close();  // Should cleanup listeners
```

3. **Monitor memory usage:**
```bash
# Check process memory
ps aux | grep bun
# Watch for growth
```

4. **Restart periodically:**
   - If leak confirmed, restart every few hours
   - Report as bug if found

---

## Testing Issues

### Error: "Test failed: expect() received undefined"

**Symptoms:**
```
fail: TypeError: undefined is not an object (evaluating 'error.status')
```

**Diagnosis:** Test error handling is incorrect for Bun's test runner.

**Solution:**
```typescript
// WRONG (Bun doesn't return error from expect().rejects.toThrow())
const error = await expect(fetchJson(url)).rejects.toThrow(HttpError);
expect(error.status).toBe(404);

// CORRECT (Use try-catch instead)
let caughtError: unknown;
try {
  await fetchJson(url);
} catch (err) {
  caughtError = err;
}
expect(caughtError).toBeInstanceOf(HttpError);
const error = caughtError as HttpError;
expect(error.status).toBe(404);
```

---

### Error: "Test timeout after 5000ms"

**Symptoms:**
```
fail: this test timed out after 5000ms
```

**Diagnosis:** Test takes too long (common with rate limiter tests).

**Solution:**
```typescript
// Use short windows for tests
const rule: RateLimitRule = {
  key: "test",
  limit: 2,
  windowMs: 100  // Short window for tests
};

// Avoid 10-second windows in tests
// WRONG: windowMs: 10000  // Will timeout!
```

---

### Error: "Cannot find module '../src/http'"

**Symptoms:**
```
Error: Cannot find module '../src/http'
```

**Diagnosis:** Running tests from wrong directory.

**Solution:**
```bash
# Always run from project root
cd /path/to/polymarket-analyzer
bun test  # Not from tests/ directory!
```

---

## When to Escalate

If you've tried all the above solutions and the issue persists:

1. **Check for existing issues:**
   - GitHub Issues: https://github.com/[your-repo]/issues
   - Search for your error message

2. **Gather diagnostic information:**
```bash
# System info
uname -a
bun --version
node --version  # if using Node

# Network check
ping -c 3 clob.polymarket.com
ping -c 3 gamma-api.polymarket.com

# Test API connectivity
curl -I https://gamma-api.polymarket.com/markets?limit=1

# Run tests
bun test

# Run with debug logging
TUI_MODE=true DEBUG=* bun --bun run dev --tui
```

3. **Create a detailed bug report:**
   - OS and version
   - Bun version
   - Full error message and stack trace
   - Steps to reproduce
   - Expected vs actual behavior
   - Diagnostic output from above

4. **Contact channels:**
   - GitHub Issues (for bugs)
   - Documentation PR (for docs issues)
   - Discussion forum (for questions)

---

## Quick Reference Command Summary

| Command | Purpose |
|---------|---------|
| `bun install` | Install dependencies |
| `bun test` | Run all tests |
| `bun typecheck` | Check TypeScript types |
| `bun --bun run dev --tui` | Start TUI interface |
| `bun --bun run dev --list-markets` | List all markets |
| `bun --bun run dev --once` | Single snapshot (no TUI) |
| `curl -I https://gamma-api.polymarket.com` | Test API connectivity |
| `ping clob.polymarket.com` | Test network connectivity |

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `TUI_MODE` | Enable TUI-optimized logging | `false` |
| `DEBUG` | Enable debug logging | `undefined` |
| `NO_COLOR` | Disable colored output | `undefined` |

---

## Additional Resources

- **Documentation:** `docs/learn/` - Comprehensive learning guide
- **Architecture:** `docs/diagrams/ARCHITECTURE.md` - System architecture
- **API Reference:** `docs/learn/03-polymarket-apis.md` - API integration guide
- **Logging:** `src/logger.ts` - Structured logging implementation
- **Error Handling:** `src/http.ts` - HTTP error handling

---

**Version:** 1.0.0
**Last Updated:** January 2026
