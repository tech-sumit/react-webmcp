import { describe, it, expect } from "vitest";
import { buildInputSchema, mapHtmlTypeToSchemaType } from "../adapters/buildSchema";

describe("mapHtmlTypeToSchemaType", () => {
  it("maps number to number", () => {
    expect(mapHtmlTypeToSchemaType("number")).toBe("number");
  });

  it("maps range to number", () => {
    expect(mapHtmlTypeToSchemaType("range")).toBe("number");
  });

  it("maps checkbox to boolean", () => {
    expect(mapHtmlTypeToSchemaType("checkbox")).toBe("boolean");
  });

  it("maps email to string", () => {
    expect(mapHtmlTypeToSchemaType("email")).toBe("string");
  });

  it("maps undefined to string", () => {
    expect(mapHtmlTypeToSchemaType(undefined)).toBe("string");
  });

  it("maps unknown types to string", () => {
    expect(mapHtmlTypeToSchemaType("tel")).toBe("string");
    expect(mapHtmlTypeToSchemaType("url")).toBe("string");
  });
});

describe("buildInputSchema", () => {
  it("produces deterministic property ordering", () => {
    const fieldsA = [
      { name: "zebra" },
      { name: "apple" },
      { name: "mango" },
    ];
    const fieldsB = [
      { name: "mango" },
      { name: "apple" },
      { name: "zebra" },
    ];

    const schemaA = buildInputSchema(fieldsA);
    const schemaB = buildInputSchema(fieldsB);

    expect(JSON.stringify(schemaA)).toBe(JSON.stringify(schemaB));
    expect(Object.keys(schemaA.properties!)).toEqual(["apple", "mango", "zebra"]);
  });

  it("sorts the required array", () => {
    const fields = [
      { name: "z", required: true },
      { name: "a", required: true },
    ];

    const schema = buildInputSchema(fields);
    expect(schema.required).toEqual(["a", "z"]);
  });

  it("maps constraints correctly", () => {
    const schema = buildInputSchema([
      {
        name: "score",
        type: "number",
        min: 0,
        max: 100,
        description: "Player score",
        title: "Score",
      },
    ]);

    const prop = schema.properties!.score;
    expect(prop.type).toBe("number");
    expect(prop.minimum).toBe(0);
    expect(prop.maximum).toBe(100);
    expect(prop.description).toBe("Player score");
    expect(prop.title).toBe("Score");
  });

  it("maps string constraints", () => {
    const schema = buildInputSchema([
      { name: "code", minLength: 3, maxLength: 10, pattern: "^[A-Z]+$" },
    ]);

    const prop = schema.properties!.code;
    expect(prop.minLength).toBe(3);
    expect(prop.maxLength).toBe(10);
    expect(prop.pattern).toBe("^[A-Z]+$");
  });

  it("maps enumValues to enum", () => {
    const schema = buildInputSchema([
      { name: "status", enumValues: ["active", "inactive"] },
    ]);

    expect(schema.properties!.status.enum).toEqual(["active", "inactive"]);
  });

  it("maps oneOf to JSON Schema oneOf", () => {
    const schema = buildInputSchema([
      {
        name: "priority",
        oneOf: [
          { value: "low", label: "Low Priority" },
          { value: "high", label: "High Priority" },
        ],
      },
    ]);

    expect(schema.properties!.priority.oneOf).toEqual([
      { const: "low", title: "Low Priority" },
      { const: "high", title: "High Priority" },
    ]);
  });

  it("omits required when no fields are required", () => {
    const schema = buildInputSchema([{ name: "optional" }]);
    expect(schema.required).toBeUndefined();
  });

  it("handles empty fields array", () => {
    const schema = buildInputSchema([]);
    expect(schema).toEqual({ type: "object", properties: {} });
  });
});
