// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "./setup";
import { QuizView } from "@/components/studio/quiz";

const mockQuestions = [
  {
    question: "What does HTML stand for?",
    options: ["HyperText Markup Language", "High Tech ML", "Home Tool ML", "None of the above"],
    correctIndex: 0,
    explanation: "HTML is HyperText Markup Language.",
  },
  {
    question: "Which language runs in the browser?",
    options: ["Java", "Python", "JavaScript", "C++"],
    correctIndex: 2,
    explanation: "JavaScript runs natively in web browsers.",
  },
];

describe("QuizView", () => {
  it("renders the first question", () => {
    render(<QuizView data={mockQuestions} />);
    expect(screen.getByText("What does HTML stand for?")).toBeInTheDocument();
    expect(screen.getByText("Q1")).toBeInTheDocument();
  });

  it("shows question progress", () => {
    render(<QuizView data={mockQuestions} />);
    expect(screen.getByText("questionOf")).toBeInTheDocument();
  });

  it("renders all options with letter labels", () => {
    render(<QuizView data={mockQuestions} />);
    expect(screen.getByText("HyperText Markup Language")).toBeInTheDocument();
    expect(screen.getByText("High Tech ML")).toBeInTheDocument();
    expect(screen.getByText("Home Tool ML")).toBeInTheDocument();
    expect(screen.getByText("None of the above")).toBeInTheDocument();
  });

  it("check answer button is disabled when no option selected", () => {
    render(<QuizView data={mockQuestions} />);
    const checkBtn = screen.getByRole("button", { name: "checkAnswer" });
    expect(checkBtn).toBeDisabled();
  });

  it("enables check button after selecting an option", () => {
    render(<QuizView data={mockQuestions} />);
    // Select correct option
    fireEvent.click(screen.getByRole("button", { name: "A: HyperText Markup Language" }));
    const checkBtn = screen.getByRole("button", { name: "checkAnswer" });
    expect(checkBtn).not.toBeDisabled();
  });

  it("shows correct banner when right answer checked", () => {
    render(<QuizView data={mockQuestions} />);
    fireEvent.click(screen.getByRole("button", { name: "A: HyperText Markup Language" }));
    fireEvent.click(screen.getByRole("button", { name: "checkAnswer" }));
    expect(screen.getByText("correctBanner")).toBeInTheDocument();
    expect(screen.getByText(/explanation/i)).toBeInTheDocument();
  });

  it("shows incorrect banner when wrong answer checked", () => {
    render(<QuizView data={mockQuestions} />);
    fireEvent.click(screen.getByRole("button", { name: "B: High Tech ML" }));
    fireEvent.click(screen.getByRole("button", { name: "checkAnswer" }));
    expect(screen.getByText("incorrectBanner")).toBeInTheDocument();
  });

  it("advances to next question after checking", () => {
    render(<QuizView data={mockQuestions} />);
    fireEvent.click(screen.getByRole("button", { name: "A: HyperText Markup Language" }));
    fireEvent.click(screen.getByRole("button", { name: "checkAnswer" }));
    // Next button should appear
    fireEvent.click(screen.getByRole("button", { name: "nextQuestion" }));
    expect(screen.getByText("Which language runs in the browser?")).toBeInTheDocument();
    expect(screen.getByText("Q2")).toBeInTheDocument();
  });

  it("shows results after last question", () => {
    render(<QuizView data={mockQuestions} />);
    // Q1: correct
    fireEvent.click(screen.getByRole("button", { name: "A: HyperText Markup Language" }));
    fireEvent.click(screen.getByRole("button", { name: "checkAnswer" }));
    fireEvent.click(screen.getByRole("button", { name: "nextQuestion" }));
    // Q2: correct
    fireEvent.click(screen.getByRole("button", { name: "C: JavaScript" }));
    fireEvent.click(screen.getByRole("button", { name: "checkAnswer" }));
    fireEvent.click(screen.getByRole("button", { name: "seeResults" }));
    // Results screen
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("correct")).toBeInTheDocument();
    expect(screen.getByText("perfectScore")).toBeInTheDocument();
  });

  it("restart button resets the quiz", () => {
    render(<QuizView data={mockQuestions} />);
    // Complete quiz
    fireEvent.click(screen.getByRole("button", { name: "A: HyperText Markup Language" }));
    fireEvent.click(screen.getByRole("button", { name: "checkAnswer" }));
    fireEvent.click(screen.getByRole("button", { name: "nextQuestion" }));
    fireEvent.click(screen.getByRole("button", { name: "C: JavaScript" }));
    fireEvent.click(screen.getByRole("button", { name: "checkAnswer" }));
    fireEvent.click(screen.getByRole("button", { name: "seeResults" }));
    // Restart
    fireEvent.click(screen.getByRole("button", { name: "tryAgain" }));
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("What does HTML stand for?")).toBeInTheDocument();
  });
});
