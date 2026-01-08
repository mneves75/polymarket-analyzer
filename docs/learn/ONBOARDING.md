# Onboarding Guide - Polymarket Analyzer

> **"The first day is the most important. Good onboarding defines success."**
> -- Talent Management Principle

---

## Overview

This guide provides a structured 90-day plan for new developers joining the Polymarket Analyzer team. The goal is to transform you from a beginner to a productive contributor in a progressive and sustainable manner.

---

## Onboarding Objectives

### 30 Days (First Month)
- [ ] Understand the basic project architecture
- [ ] Set up the development environment
- [ ] Run the project locally
- [ ] Comprehend the main data flow
- [ ] Make first contribution (bug fix or documentation)

### 60 Days (Second Month)
- [ ] Master the Polymarket APIs (Gamma, CLOB, Data)
- [ ] Understand WebSocket and real-time communication
- [ ] Contribute small features
- [ ] Write tests for existing code
- [ ] Participate in code reviews

### 90 Days (Third Month)
- [ ] Develop complete features independently
- [ ] Optimize performance
- [ ] Understand rate limiting and caching strategies
- [ ] Contribute to architecture and design decisions
- [ ] Mentor new team members

---

## Week 1: Fundamentals and Setup

### Day 1: Environment Setup

**Objectives:**
- [ ] Install Bun 1.3.5+
- [ ] Install VS Code (or preferred IDE)
- [ ] Clone repository
- [ ] Run project for the first time
- [ ] Understand directory structure

**Tasks:**

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Verify installation
bun --version  # Should be 1.3.5+

# 3. Clone repository
git clone <repository-url>
cd polymarket-analyzer

# 4. Install dependencies
bun install

# 5. Run project
bun --bun run dev  # Should open the TUI interface
```

**VS Code Configuration:**

Install extensions:
- TypeScript extension
- Error Lens (shows errors inline)
- GitLens (git history)
- Markdown Preview Enhanced

**Required Reading:**
- [ ] `docs/learn/00-introduction.md`
- [ ] `docs/learn/01-bun-typescript-ecosystem.md`

**Milestone:** DONE - Project running locally

---

### Day 2: Architecture and Structure

**Objectives:**
- [ ] Understand architecture layers
- [ ] Map main files
- [ ] Comprehend data flow

**Tasks:**

1. **Reading:**
   - [ ] `docs/learn/02-architecture-structure.md` (complete)

2. **Practical Exercise:**
   ```typescript
   // Execute the following to understand the flow:
   bun --bun run markets  // List markets
   bun --bun run snapshot  // Export JSON snapshot
   bun --bun run dev --market <id>  // Open specific market
   ```

3. **Code Mapping:**
   - [ ] Open each file in `src/`
   - [ ] Understand what each file does
   - [ ] Draw the data flow on paper

**Validation Quiz:**
```markdown
1. What is the responsibility of `api.ts`?
2. How does `rateLimiter.ts` work?
3. What is the difference between WebSocket and REST?
```

**Milestone:** DONE - Architecture understood

---

### Day 3: Polymarket APIs

**Objectives:**
- [ ] Understand Gamma API
- [ ] Understand CLOB API
- [ ] Understand Data API

**Tasks:**

1. **Reading:**
   - [ ] `docs/learn/03-apis-polymarket.md` (complete)

2. **Manual Exploration:**
   ```bash
   # Test Gamma API
   curl "https://gamma-api.polymarket.com/events?limit=5"

   # Test CLOB API (needs token ID first)
   curl "https://clob.polymarket.com/book?token_id=<ID>"
   ```

3. **Practical Exercise:**
   ```typescript
   // Create a test-apis.ts file:
   import { fetchEvents, fetchMarkets } from "./src/api";

   const events = await fetchEvents(5);
   console.log("Events:", events);

   const markets = await fetchMarkets(10);
   console.log("Markets:", markets);
   ```

**Milestone:** DONE - APIs understood

---

### Days 4-5: WebSocket and Real-Time

**Objectives:**
- [ ] Understand WebSocket protocol
- [ ] Comprehend reconnection strategy
- [ ] See heartbeat and stale detection

**Tasks:**

1. **Reading:**
   - [ ] `docs/learn/04-websockets-realtime.md` (complete)

2. **WebSocket Test:**
   ```bash
   # Install wscat to test WS manually
   bun install -g wscat

   # Connect to Polymarket WebSocket
   wscat -c wss://ws-subscriptions-clob.polymarket.com/ws/

   # Send subscription message
   {"type":"MARKET","assets_ids":["<token_id>"],"custom_feature_enabled":true}
   ```

3. **Debug Exercise:**
   - [ ] Add `console.log` in `src/ws.ts`
   - [ ] Run `bun --bun run dev`
   - [ ] Observe WebSocket messages in the terminal

**Milestone:** DONE - Real-time understood

---

## Weeks 2-4: Technical Deep Dive

### Week 2: Data Layer

**Objectives:**
- [ ] Master `api.ts` (all endpoints)
- [ ] Understand `parsers.ts` (normalization)
- [ ] Learn `http.ts` (rate limiting)

**Daily Tasks:**

**Days 6-7: Data Normalization**
```typescript
// Exercise: Add new parser
// 1. Read src/parsers.ts
// 2. Understand normalizeOrderbook()
// 3. Create normalizeMarketStats()
```

**Days 8-9: Rate Limiting**
```typescript
// Exercise: Test rate limiting
// 1. Create script that makes 1000 requests
// 2. Observe how token bucket works
// 3. Adjust limits in src/config.ts
```

**Day 10: Tests**
- [ ] `bun test` (all should pass)
- [ ] Understand existing tests
- [ ] Add a new test

**Milestone:** DONE - Data layer mastered

---

### Week 3: Domain Layer

**Objectives:**
- [ ] Master `market.ts` (resolution)
- [ ] Understand `utils.ts` (formatting)
- [ ] Learn `parsers.ts` (normalization)

**Daily Tasks:**

**Days 11-12: Market Resolution**
```typescript
// Exercise: Resolution strategies
// 1. Read src/market.ts
// 2. Test resolveMarket() with different inputs
// 3. Add new fallback strategy
```

**Days 13-14: Formatting and Sparklines**
```typescript
// Exercise: Create new formatting function
// 1. Read src/utils.ts
// 2. Understand sparkline()
// 3. Create function to format volume
```

**Day 15: Integration**
- [ ] Run complete flow (CLI -> API -> TUI)
- [ ] Debug step by step
- [ ] Document learnings

**Milestone:** DONE - Domain layer mastered

---

### Week 4: Presentation Layer

**Objectives:**
- [ ] Understand `tui.ts` (interface)
- [ ] Learn Blessed (TUI library)
- [ ] Create new visual component

**Daily Tasks:**

**Days 16-17: Exploring TUI**
```typescript
// Exercise: Understand interface
// 1. Read src/tui.ts (682 lines!)
// 2. Map all components
// 3. Understand render cycle
```

**Days 18-19: Creating Component**
```typescript
// Exercise: Add new panel
// 1. Create "Statistics Panel"
// 2. Show 24h volume, variation, etc.
// 3. Integrate with refresh loop
```

**Day 20: UI Tests**
- [ ] Test interactivity (keys n, p, o, s, q)
- [ ] Verify responsiveness
- [ ] Test with different terminal sizes

**Milestone:** DONE - Presentation layer mastered

---

## Month 2: Active Contribution

### Weeks 5-6: Small Features

**Objectives:**
- [ ] First contribution accepted
- [ ] Understand pull request process
- [ ] Participate in code review

**Weekly Tasks:**

**Week 5:**
1. **Choose an issue:**
   - Bug: "TUI doesn't update when WebSocket reconnects"
   - Feature: "Add --json flag for markets"
   - Docs: "Improve README"

2. **Implementation:**
   ```bash
   git checkout -b fix/tui-reconnect
   # Make changes
   git commit -m "Fix: TUI update on WS reconnect"
   git push origin fix/tui-reconnect
   ```

3. **Pull Request:**
   - [ ] Describe change
   - [ ] Reference issue
   - [ ] Request review

**Week 6:**
1. **Code Review of Others:**
   - [ ] Review 1 PR from another developer
   - [ ] Learn from others' code
   - [ ] Give constructive feedback

2. **Second Contribution:**
   - [ ] Choose more complex issue
   - [ ] Implement with tests
   - [ ] Document changes

**Milestone:** DONE - 2 contributions accepted

---

### Weeks 7-8: Testing and Quality

**Objectives:**
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Achieve 80% coverage

**Weekly Tasks:**

**Week 7: Unit Tests**
```typescript
// Exercise: Tests for api.ts
describe("fetchEvents", () => {
  it("should return active events", async () => {
    const events = await fetchEvents(5);
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeLessThanOrEqual(5);
  });
});
```

**Week 8: Integration Tests**
```typescript
// Exercise: Complete flow tests
describe("loadRadar", () => {
  it("should load and normalize markets", async () => {
    const radar = await loadRadar(10);
    expect(radar).toHaveLength(10);
    expect(radar[0].conditionId).toBeDefined();
  });
});
```

**Milestone:** DONE - Testing mastered

---

## Month 3: Autonomy and Leadership

### Weeks 9-10: Complex Features

**Objectives:**
- [ ] Develop complete feature
- [ ] Architect solution
- [ ] Document decisions

**Feature Example:**
```markdown
## Feature: Alert System

### Description
Notify user when:
- Price changes > X%
- Volume increases abnormally
- WebSocket disconnects

### Architecture
- New file: src/alerts.ts
- Integrate with: ws.ts (receive updates)
- Render in: tui.ts (alerts panel)

### Design Decisions
- Visual vs audio alerts? -> Visual
- Limit of simultaneous alerts? -> 5
- Alert history? -> Yes, last 50
```

**Milestone:** DONE - Complex feature delivered

---

### Weeks 11-12: Optimization and Performance

**Objectives:**
- [ ] Identify bottlenecks
- [ ] Implement cache
- [ ] Optimize queries

**Tasks:**

1. **Profiling:**
   ```bash
   # Use Bun's built-in profiler
   bun --prof run src/index.ts
   ```

2. **Optimizations:**
   - [ ] Market cache (1 minute TTL)
   - [ ] TUI update debounce
   - [ ] Lazy loading of data

3. **Metrics:**
   - [ ] Startup time: < 3s
   - [ ] Bundle size: < 500KB
   - [ ] Memory usage: < 100MB

**Milestone:** DONE - Performance optimized

---

## Continuous Learning Plan

### Required Resources

**Tools:**
- [ ] Bun: https://bun.sh/docs
- [ ] TypeScript: https://www.typescriptlang.org/docs/
- [ ] Blessed: https://github.com/chjj/blessed

**Concepts:**
- [ ] Rate Limiting: Token Bucket Algorithm
- [ ] WebSocket: RFC 6455
- [ ] TUI: ncurses, terminal escape codes

**Best Practices:**
- [ ] Clean Code: Robert C. Martin
- [ ] Refactoring: Martin Fowler
- [ ] Design Patterns: Gang of Four

---

## Progress System

### Monthly Checkpoints

**Month 1 - Fundamentals:**
- [ ] 4 chapter checkpoints
- [ ] 5 practical exercises
- [ ] 1 contribution

**Month 2 - Deep Dive:**
- [ ] 3 small features
- [ ] 10 tests written
- [ ] 2 code reviews

**Month 3 - Autonomy:**
- [ ] 1 complex feature
- [ ] 3 optimizations
- [ ] 1 design document

### Achievement Badges

```
BADGE NOVICE       - Completed Month 1
BADGE APPRENTICE   - First contribution
BADGE CONTRIBUTOR  - 5 contributions
BADGE EXPERT       - Completed Month 2
BADGE MASTER       - Completed Month 3
BADGE ARCHITECT    - Design document approved
BADGE MENTOR       - Mentored new member
```

---

## Support and Mentorship

### Help Channels

1. **Technical Questions:**
   - Slack #engineering-support
   - Issue tracker on GitHub

2. **Pair Programming:**
   - 2h/week with mentor
   - Screen share for complex problems

3. **Code Review:**
   - Every PR reviewed by senior
   - Detailed feedback

### Warning Signs

**If you feel:**
- "I'm way behind" -> Talk to manager
- "I don't understand ANYTHING" -> Schedule pair programming
- "This doesn't make sense" -> Question the architecture

**Do NOT suffer in silence!**

---

## Final Checklist

### Day 90: You should be able to:

- [ ] Explain the complete architecture to someone new
- [ ] Develop features without significant help
- [ ] Review others' code constructively
- [ ] Suggest architectural improvements
- [ ] Mentor a new developer
- [ ] Contribute to technical decisions
- [ ] Write production-ready code
- [ ] Debug complex problems

**Congratulations! You are officially a full contributor to Polymarket Analyzer!**

---

## Additional Resources

- **Playground:** `docs/learn/08-complete-exercises.md`
- **Quick Reference:** `docs/learn/README.md`
- **FAQ:** (to be created)

---

**Version:** 1.0.0
**Last Updated:** January 2026
