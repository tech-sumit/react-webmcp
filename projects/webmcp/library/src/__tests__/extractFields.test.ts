import { describe, it, expect } from "vitest";
import React from "react";
import { extractFields, extractOptions } from "../adapters/extractFields";

describe("extractOptions", () => {
  it("collects value/label pairs from children with value props", () => {
    const children = React.createElement(
      React.Fragment,
      null,
      React.createElement("option", { value: "a" }, "Alpha"),
      React.createElement("option", { value: "b" }, "Beta"),
    );

    const result = extractOptions(children);
    expect(result).toEqual([
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ]);
  });

  it("falls back to String(value) when children is not a string", () => {
    const children = React.createElement(
      React.Fragment,
      null,
      React.createElement("option", { value: 42 }, React.createElement("span", null, "Num")),
    );

    const result = extractOptions(children);
    expect(result).toEqual([{ value: 42, label: "42" }]);
  });

  it("recursively detects nested options", () => {
    const children = React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        null,
        React.createElement("option", { value: "nested" }, "Nested"),
      ),
    );

    const result = extractOptions(children);
    expect(result).toEqual([{ value: "nested", label: "Nested" }]);
  });

  it("returns empty array when no options found", () => {
    const children = React.createElement("div", null, "text only");
    expect(extractOptions(children)).toEqual([]);
  });
});

describe("extractFields", () => {
  it("detects fields from props.name", () => {
    const children = React.createElement(
      React.Fragment,
      null,
      React.createElement("input", { name: "email", type: "email", required: true }),
      React.createElement("input", { name: "age", type: "number" }),
    );

    const fields = extractFields(children);
    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({ name: "email", type: "email", required: true });
    expect(fields[1]).toMatchObject({ name: "age", type: "number" });
  });

  it("detects fields from inputProps.name", () => {
    const children = React.createElement("div", {
      inputProps: { name: "username" },
    });

    const fields = extractFields(children);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("username");
  });

  it("detects fields from slotProps.input.name", () => {
    const children = React.createElement("div", {
      slotProps: { input: { name: "search" } },
    });

    const fields = extractFields(children);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("search");
  });

  it("recurses into containers without name", () => {
    const children = React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        null,
        React.createElement("input", { name: "deep" }),
      ),
    );

    const fields = extractFields(children);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("deep");
  });

  it("auto-detects enum values from children", () => {
    const children = React.createElement(
      "select",
      { name: "priority" },
      React.createElement("option", { value: "low" }, "Low"),
      React.createElement("option", { value: "high" }, "High"),
    );

    const fields = extractFields(children);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("priority");
    expect(fields[0].enumValues).toEqual(["low", "high"]);
    expect(fields[0].oneOf).toEqual([
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
    ]);
  });

  it("extracts constraint props", () => {
    const children = React.createElement("input", {
      name: "score",
      type: "number",
      min: 0,
      max: 100,
      required: true,
    });

    const fields = extractFields(children);
    expect(fields[0]).toMatchObject({
      name: "score",
      type: "number",
      min: 0,
      max: 100,
      required: true,
    });
  });

  it("extracts string constraint props", () => {
    const children = React.createElement("input", {
      name: "code",
      minLength: 3,
      maxLength: 10,
      pattern: "^[A-Z]+$",
    });

    const fields = extractFields(children);
    expect(fields[0]).toMatchObject({
      name: "code",
      minLength: 3,
      maxLength: 10,
      pattern: "^[A-Z]+$",
    });
  });

  it("returns empty array for non-element children", () => {
    expect(extractFields("just text")).toEqual([]);
    expect(extractFields(null)).toEqual([]);
    expect(extractFields(undefined)).toEqual([]);
  });
});
