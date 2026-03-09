// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "./setup";
import { FlashcardsView } from "@/components/studio/flashcards";

const mockCards = [
  { front: "What is React?", back: "A JavaScript library for building UIs" },
  { front: "What is JSX?", back: "A syntax extension for JavaScript" },
  { front: "What is a hook?", back: "A function that lets you use state in function components" },
];

describe("FlashcardsView", () => {
  it("renders all cards with front text", () => {
    render(<FlashcardsView data={mockCards} />);
    expect(screen.getByText("What is React?")).toBeInTheDocument();
    expect(screen.getByText("What is JSX?")).toBeInTheDocument();
    expect(screen.getByText("What is a hook?")).toBeInTheDocument();
  });

  it("shows card numbers", () => {
    render(<FlashcardsView data={mockCards} />);
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });

  it("flips a card on click", () => {
    render(<FlashcardsView data={mockCards} />);
    // Back text exists in DOM but is visually hidden via CSS transform
    const backText = screen.getByText("A JavaScript library for building UIs");
    expect(backText).toBeInTheDocument();

    // Click the first card button to flip
    const buttons = screen.getAllByRole("button");
    const cardButton = buttons.find((b) => b.textContent?.includes("What is React?"));
    expect(cardButton).toBeTruthy();
    fireEvent.click(cardButton!);

    // Flipped counter should update
    expect(screen.getByText("flipped")).toBeInTheDocument();
  });

  it("shuffles cards on shuffle button click", () => {
    render(<FlashcardsView data={mockCards} />);
    const shuffleBtn = screen.getByRole("button", { name: "shuffle" });
    expect(shuffleBtn).toBeInTheDocument();
    // Should not throw
    fireEvent.click(shuffleBtn);
  });

  it("resets cards on reset button click", () => {
    render(<FlashcardsView data={mockCards} />);
    const resetBtn = screen.getByRole("button", { name: "reset" });
    fireEvent.click(resetBtn);
    // Cards should still be present after reset
    expect(screen.getByText("What is React?")).toBeInTheDocument();
  });

  it("handles keyboard Space to flip focused card", () => {
    render(<FlashcardsView data={mockCards} />);
    // Press Space to flip focused card (default index 0)
    fireEvent.keyDown(window, { key: " " });
    // Flipped counter should update
    expect(screen.getByText("flipped")).toBeInTheDocument();
  });

  it("handles keyboard arrow navigation", () => {
    render(<FlashcardsView data={mockCards} />);
    // Press ArrowRight to move focus
    fireEvent.keyDown(window, { key: "ArrowRight" });
    // Press Space to flip card at index 1
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("flipped")).toBeInTheDocument();
  });
});
