import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardBody, CardFooter } from "../Card";

describe("Card component suite", () => {
  it("renders full card structure using named exports and default semantic elements", () => {
    render(
      <Card data-testid="card-root">
        <CardHeader data-testid="card-header">Header Title</CardHeader>
        <CardBody data-testid="card-body">Body Content</CardBody>
        <CardFooter data-testid="card-footer">Footer Content</CardFooter>
      </Card>
    );

    const card = screen.getByTestId("card-root");
    expect(card.tagName.toLowerCase()).toBe("section");
    expect(card).toHaveClass("bg-white", "rounded-xl", "border");

    const header = screen.getByTestId("card-header");
    expect(header.tagName.toLowerCase()).toBe("header");
    expect(header).toHaveTextContent("Header Title");

    const body = screen.getByTestId("card-body");
    expect(body).toHaveTextContent("Body Content");

    const footer = screen.getByTestId("card-footer");
    expect(footer.tagName.toLowerCase()).toBe("footer");
    expect(footer).toHaveTextContent("Footer Content");
  });

  it("supports compound dot-notation syntax", () => {
    render(
      <Card data-testid="compound-card">
        <Card.Header>Compound Header</Card.Header>
        <Card.Body>Compound Body</Card.Body>
        <Card.Footer>Compound Footer</Card.Footer>
      </Card>
    );

    expect(screen.getByText("Compound Header")).toBeInTheDocument();
    expect(screen.getByText("Compound Body")).toBeInTheDocument();
    expect(screen.getByText("Compound Footer")).toBeInTheDocument();
  });

  it("supports custom semantic html tags via 'as' prop", () => {
    render(
      <Card as="article" data-testid="article-card">
        <CardBody as="main">Article Body</CardBody>
      </Card>
    );

    const card = screen.getByTestId("article-card");
    expect(card.tagName.toLowerCase()).toBe("article");
  });
});
