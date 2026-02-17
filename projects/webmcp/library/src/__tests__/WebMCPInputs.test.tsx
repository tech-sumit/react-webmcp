import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { WebMCPInput } from "../components/WebMCPInput";
import { WebMCPSelect } from "../components/WebMCPSelect";
import { WebMCPTextarea } from "../components/WebMCPTextarea";

describe("WebMCPInput", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an input element", () => {
    const { container } = render(<WebMCPInput name="field" type="text" />);
    const input = container.querySelector("input");
    expect(input).toBeTruthy();
    expect(input!.getAttribute("name")).toBe("field");
    expect(input!.getAttribute("type")).toBe("text");
  });

  it("sets toolparamtitle attribute", () => {
    const { container } = render(
      <WebMCPInput name="name" toolParamTitle="Full Name" />,
    );
    expect(container.querySelector("input")!.getAttribute("toolparamtitle")).toBe("Full Name");
  });

  it("sets toolparamdescription attribute", () => {
    const { container } = render(
      <WebMCPInput name="name" toolParamDescription="Customer name" />,
    );
    expect(
      container.querySelector("input")!.getAttribute("toolparamdescription"),
    ).toBe("Customer name");
  });

  it("does not set webmcp attributes when not provided", () => {
    const { container } = render(<WebMCPInput name="plain" />);
    const input = container.querySelector("input")!;
    expect(input.hasAttribute("toolparamtitle")).toBe(false);
    expect(input.hasAttribute("toolparamdescription")).toBe(false);
  });

  it("passes through standard input props", () => {
    const { container } = render(
      <WebMCPInput
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        minLength={5}
      />,
    );
    const input = container.querySelector("input")!;
    expect(input.required).toBe(true);
    expect(input.placeholder).toBe("you@example.com");
    expect(input.minLength).toBe(5);
  });
});

describe("WebMCPSelect", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a select element with options", () => {
    const { container } = render(
      <WebMCPSelect name="guests">
        <option value="1">1</option>
        <option value="2">2</option>
      </WebMCPSelect>,
    );
    const select = container.querySelector("select")!;
    expect(select).toBeTruthy();
    expect(select.options).toHaveLength(2);
  });

  it("sets toolparamtitle attribute", () => {
    const { container } = render(
      <WebMCPSelect name="seating" toolParamTitle="Seating Area">
        <option value="indoor">Indoor</option>
      </WebMCPSelect>,
    );
    expect(
      container.querySelector("select")!.getAttribute("toolparamtitle"),
    ).toBe("Seating Area");
  });

  it("sets toolparamdescription attribute", () => {
    const { container } = render(
      <WebMCPSelect name="size" toolParamDescription="Party size">
        <option value="2">2</option>
      </WebMCPSelect>,
    );
    expect(
      container.querySelector("select")!.getAttribute("toolparamdescription"),
    ).toBe("Party size");
  });

  it("does not set webmcp attributes when not provided", () => {
    const { container } = render(
      <WebMCPSelect name="plain">
        <option value="a">A</option>
      </WebMCPSelect>,
    );
    const select = container.querySelector("select")!;
    expect(select.hasAttribute("toolparamtitle")).toBe(false);
    expect(select.hasAttribute("toolparamdescription")).toBe(false);
  });

  it("passes through standard select props", () => {
    const { container } = render(
      <WebMCPSelect name="multi" multiple className="my-select">
        <option value="a">A</option>
        <option value="b">B</option>
      </WebMCPSelect>,
    );
    const select = container.querySelector("select")!;
    expect(select.multiple).toBe(true);
    expect(select.className).toBe("my-select");
  });
});

describe("WebMCPTextarea", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a textarea element", () => {
    const { container } = render(<WebMCPTextarea name="notes" rows={3} />);
    const textarea = container.querySelector("textarea")!;
    expect(textarea).toBeTruthy();
    expect(textarea.rows).toBe(3);
  });

  it("sets toolparamtitle attribute", () => {
    const { container } = render(
      <WebMCPTextarea name="notes" toolParamTitle="Special Notes" />,
    );
    expect(
      container.querySelector("textarea")!.getAttribute("toolparamtitle"),
    ).toBe("Special Notes");
  });

  it("sets toolparamdescription attribute", () => {
    const { container } = render(
      <WebMCPTextarea name="requests" toolParamDescription="Dietary needs" />,
    );
    expect(
      container.querySelector("textarea")!.getAttribute("toolparamdescription"),
    ).toBe("Dietary needs");
  });

  it("does not set webmcp attributes when not provided", () => {
    const { container } = render(<WebMCPTextarea name="plain" />);
    const textarea = container.querySelector("textarea")!;
    expect(textarea.hasAttribute("toolparamtitle")).toBe(false);
    expect(textarea.hasAttribute("toolparamdescription")).toBe(false);
  });

  it("passes through standard textarea props", () => {
    const { container } = render(
      <WebMCPTextarea
        name="bio"
        rows={5}
        maxLength={500}
        placeholder="About yourself"
      />,
    );
    const textarea = container.querySelector("textarea")!;
    expect(textarea.rows).toBe(5);
    expect(textarea.maxLength).toBe(500);
    expect(textarea.placeholder).toBe("About yourself");
  });
});
