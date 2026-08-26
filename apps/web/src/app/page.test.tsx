import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import HomePage from "../../app/page";

describe("FlowDesk landing page", () => {
  it("presents a semantic workflow introduction and early-access action", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Keep client work moving.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Primary" }),
    ).toContainElement(
      screen.getByRole("link", { name: "Request early access" }),
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "A calmer way to run the day",
      }),
    ).toBeVisible();
  });
});
