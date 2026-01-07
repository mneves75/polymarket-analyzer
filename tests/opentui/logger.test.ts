/**
 * Unit tests for OpenTUI Logger
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { LogLevel, logger } from "../../src/opentui/logger";

describe("TUILogger", () => {
  beforeEach(() => {
    logger.clear();
    logger.setLevel(LogLevel.DEBUG);
    logger.setWriteToStderr(false); // Disable stderr output for tests
  });

  afterEach(() => {
    logger.clear();
  });

  describe("logging methods", () => {
    it("debug logs at DEBUG level", () => {
      logger.debug("Debug message", { key: "value" });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].levelName).toBe("DEBUG");
      expect(logs[0].message).toBe("Debug message");
      expect(logs[0].context).toEqual({ key: "value" });
    });

    it("info logs at INFO level", () => {
      logger.info("Info message");

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].levelName).toBe("INFO");
      expect(logs[0].message).toBe("Info message");
    });

    it("warn logs at WARN level", () => {
      logger.warn("Warning message", { count: 5 });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].levelName).toBe("WARN");
      expect(logs[0].message).toBe("Warning message");
    });

    it("error logs at ERROR level", () => {
      logger.error("Error message", { error: "details" });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].levelName).toBe("ERROR");
      expect(logs[0].message).toBe("Error message");
    });
  });

  describe("log level filtering", () => {
    it("filters logs below minimum level", () => {
      logger.setLevel(LogLevel.WARN);

      logger.debug("Debug");
      logger.info("Info");
      logger.warn("Warn");
      logger.error("Error");

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].levelName).toBe("WARN");
      expect(logs[1].levelName).toBe("ERROR");
    });

    it("includes all levels when set to DEBUG", () => {
      logger.setLevel(LogLevel.DEBUG);

      logger.debug("Debug");
      logger.info("Info");
      logger.warn("Warn");
      logger.error("Error");

      const logs = logger.getLogs();
      expect(logs).toHaveLength(4);
    });

    it("only includes ERROR when set to ERROR", () => {
      logger.setLevel(LogLevel.ERROR);

      logger.debug("Debug");
      logger.info("Info");
      logger.warn("Warn");
      logger.error("Error");

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].levelName).toBe("ERROR");
    });
  });

  describe("log storage", () => {
    it("includes timestamp on each log", () => {
      const before = Date.now();
      logger.info("Test");
      const after = Date.now();

      const logs = logger.getLogs();
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(logs[0].timestamp).toBeLessThanOrEqual(after);
    });

    it("returns copy of logs array", () => {
      logger.info("Test 1");
      logger.info("Test 2");

      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();

      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  describe("getRecentLogs", () => {
    it("returns recent logs filtered by level", () => {
      logger.debug("Debug 1");
      logger.info("Info 1");
      logger.warn("Warn 1");
      logger.error("Error 1");
      logger.debug("Debug 2");
      logger.info("Info 2");

      const recentWarnings = logger.getRecentLogs(LogLevel.WARN, 10);
      expect(recentWarnings).toHaveLength(2);
      expect(recentWarnings[0].levelName).toBe("WARN");
      expect(recentWarnings[1].levelName).toBe("ERROR");
    });

    it("limits returned logs", () => {
      for (let i = 0; i < 20; i++) {
        logger.info(`Message ${i}`);
      }

      const recent = logger.getRecentLogs(LogLevel.DEBUG, 5);
      expect(recent).toHaveLength(5);
      expect(recent[0].message).toBe("Message 15");
      expect(recent[4].message).toBe("Message 19");
    });
  });

  describe("clear", () => {
    it("removes all logs", () => {
      logger.info("Test 1");
      logger.info("Test 2");
      logger.info("Test 3");

      expect(logger.getLogs()).toHaveLength(3);

      logger.clear();

      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe("getCounts", () => {
    it("returns counts by level", () => {
      logger.debug("Debug 1");
      logger.debug("Debug 2");
      logger.info("Info 1");
      logger.warn("Warn 1");
      logger.warn("Warn 2");
      logger.warn("Warn 3");
      logger.error("Error 1");

      const counts = logger.getCounts();

      expect(counts.DEBUG).toBe(2);
      expect(counts.INFO).toBe(1);
      expect(counts.WARN).toBe(3);
      expect(counts.ERROR).toBe(1);
    });

    it("returns zeros for empty log", () => {
      const counts = logger.getCounts();

      expect(counts.DEBUG).toBe(0);
      expect(counts.INFO).toBe(0);
      expect(counts.WARN).toBe(0);
      expect(counts.ERROR).toBe(0);
    });
  });

  describe("log rotation", () => {
    it("trims old logs when max is exceeded", () => {
      // Default maxLogs is 100
      for (let i = 0; i < 150; i++) {
        logger.info(`Message ${i}`);
      }

      const logs = logger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
      // Should have kept the most recent logs
      expect(logs[logs.length - 1].message).toBe("Message 149");
    });
  });
});
