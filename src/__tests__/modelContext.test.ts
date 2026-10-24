import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getModelContext,
  isWebMCPAvailable,
  isWebMCPTestingAvailable,
  warnIfUnavailable,
  validateToolDefinition,
  listWebMCPTools,
  executeWebMCPTool,
} from "../utils/modelContext";
import {
  installMockModelContext,
  installLegacyModelContext,
  removeMockModelContext,
  installMockModelContextTesting,
  removeMockModelContextTesting,
} from "./helpers";

describe("ModelContext utilities", () => {
  afterEach(() => {
    removeMockModelContext();
    removeMockModelContextTesting();
  });

  describe("getModelContext", () => {
    it("returns null when modelContext is not available", () => {
      expect(getModelContext()).toBeNull();
    });

    it("returns document.modelContext when available", () => {
      const mc = installMockModelContext();
      expect(getModelContext()).toBe(mc);
    });

    it("falls back to the legacy navigator.modelContext", () => {
      const mc = installLegacyModelContext();
      expect(getModelContext()).toBe(mc);
    });
  });

  describe("isWebMCPAvailable", () => {
    it("returns false when modelContext is not available", () => {
      expect(isWebMCPAvailable()).toBe(false);
    });

    it("returns true when modelContext is available", () => {
      installMockModelContext();
      expect(isWebMCPAvailable()).toBe(true);
    });
  });

  describe("isWebMCPTestingAvailable", () => {
    it("returns false when modelContextTesting is not available", () => {
      expect(isWebMCPTestingAvailable()).toBe(false);
    });

    it("returns true when modelContextTesting is available", () => {
      installMockModelContextTesting();
      expect(isWebMCPTestingAvailable()).toBe(true);
    });
  });

  describe("warnIfUnavailable", () => {
    it("warns when modelContext is not available", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      warnIfUnavailable("testHook");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("document.modelContext is not available"),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("testHook"),
      );
      warnSpy.mockRestore();
    });

    it("does not warn when modelContext is available", () => {
      installMockModelContext();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      warnIfUnavailable("testHook");
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe("validateToolDefinition", () => {
    it("accepts spec-valid names", () => {
      expect(() =>
        validateToolDefinition({ name: "search_flights.v2-beta", description: "d" }),
      ).not.toThrow();
    });

    it.each(["", "has space", "emoji🙂", "a".repeat(129)])("rejects name %j", (name) => {
      expect(() => validateToolDefinition({ name, description: "d" })).toThrow();
    });

    it("rejects an empty description", () => {
      expect(() => validateToolDefinition({ name: "ok", description: "" })).toThrow(
        /description/,
      );
    });
  });

  describe("listWebMCPTools", () => {
    it("returns [] when WebMCP is unavailable", async () => {
      await expect(listWebMCPTools()).resolves.toEqual([]);
    });

    it("returns getTools() results", async () => {
      const mc = installMockModelContext();
      mc.getTools.mockResolvedValue([{ name: "t", description: "d" }]);
      await expect(listWebMCPTools()).resolves.toEqual([{ name: "t", description: "d" }]);
    });
  });

  describe("executeWebMCPTool", () => {
    it("executes a tool by name with an input object", async () => {
      const mc = installMockModelContext();
      const tool = { name: "t", description: "d", origin: "https://x", window };
      mc.getTools.mockResolvedValue([tool]);
      mc.executeTool.mockResolvedValue('{"ok":true}');

      await expect(executeWebMCPTool("t", { a: 1 })).resolves.toBe('{"ok":true}');
      expect(mc.executeTool).toHaveBeenCalledWith(tool, { a: 1 }, {});
    });

    it("retries with a JSON string when the browser rejects the object form", async () => {
      const mc = installMockModelContext();
      const tool = { name: "t", description: "d", origin: "https://x", window };
      mc.getTools.mockResolvedValue([tool]);
      mc.executeTool
        .mockRejectedValueOnce(new DOMException("Failed to parse input arguments", "UnknownError"))
        .mockResolvedValueOnce("ok");

      await expect(executeWebMCPTool("t", { a: 1 })).resolves.toBe("ok");
      expect(mc.executeTool).toHaveBeenLastCalledWith(tool, '{"a":1}', {});
    });

    it("rejects with NotFoundError for unknown tools", async () => {
      installMockModelContext();
      await expect(executeWebMCPTool("missing")).rejects.toMatchObject({ name: "NotFoundError" });
    });
  });
});
