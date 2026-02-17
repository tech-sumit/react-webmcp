import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getModelContext,
  isWebMCPAvailable,
  isWebMCPTestingAvailable,
  warnIfUnavailable,
} from "../utils/modelContext";
import {
  installMockModelContext,
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

    it("returns the modelContext when available", () => {
      const mc = installMockModelContext();
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
        expect.stringContaining("navigator.modelContext is not available"),
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
});
