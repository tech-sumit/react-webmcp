import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateSchema } from "../adapters/validateSchema";

describe("validateSchema", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("warns on duplicate field names", () => {
    validateSchema([
      { name: "email" },
      { name: "email" },
    ]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate field name "email"'),
    );
  });

  it("warns on pattern used with non-string type", () => {
    validateSchema([{ name: "count", type: "number", pattern: "^\\d+$" }]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("pattern is only valid for string types"),
    );
  });

  it("warns on min/max used with non-number type", () => {
    validateSchema([{ name: "name", min: 0, max: 10 }]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("min/max are only valid for number types"),
    );
  });

  it("warns on minLength/maxLength used with non-string type", () => {
    validateSchema([{ name: "count", type: "number", minLength: 1 }]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("minLength/maxLength are only valid for string types"),
    );
  });

  it("warns on enum type mismatch for number fields", () => {
    validateSchema([
      { name: "count", type: "number", enumValues: ["one", "two"] },
    ]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("is not a number"),
    );
  });

  it("warns on enum type mismatch for string fields", () => {
    validateSchema([
      { name: "status", type: "text", enumValues: [42, true] },
    ]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('enum value 42 is not a string'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('enum value true is not a string'),
    );
  });

  it("does not warn for valid schemas", () => {
    validateSchema([
      { name: "email", type: "email", required: true },
      { name: "age", type: "number", min: 0, max: 120 },
      { name: "code", type: "text", pattern: "^[A-Z]+$" },
    ]);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("throws in strict mode", () => {
    expect(() => {
      validateSchema(
        [{ name: "email" }, { name: "email" }],
        { strict: true },
      );
    }).toThrow("[react-webmcp]");
  });

  it("is a no-op in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    warnSpy.mockClear();

    validateSchema([{ name: "email" }, { name: "email" }]);
    expect(warnSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
