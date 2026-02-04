import { render, screen, fireEvent } from "@testing-library/react";
import LikertScale from "@/components/LikertScale";

describe("LikertScale", () => {
  const defaultProps = {
    min: 1,
    max: 7,
    minLabel: "Strongly disagree",
    maxLabel: "Strongly agree",
    value: null as number | null,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 7 buttons for a 1-7 scale", () => {
    render(<LikertScale {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(7);

    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("shows endpoint labels (minLabel, maxLabel)", () => {
    render(<LikertScale {...defaultProps} />);

    expect(screen.getByText("Strongly disagree")).toBeInTheDocument();
    expect(screen.getByText("Strongly agree")).toBeInTheDocument();
  });

  it("clicking a button calls onChange with the correct value", () => {
    const onChange = vi.fn();
    render(<LikertScale {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByText("4"));
    expect(onChange).toHaveBeenCalledWith(4);

    fireEvent.click(screen.getByText("1"));
    expect(onChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText("7"));
    expect(onChange).toHaveBeenCalledWith(7);

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("selected button has different styling (bg-foreground class)", () => {
    render(<LikertScale {...defaultProps} value={3} />);

    const selectedButton = screen.getByText("3");
    expect(selectedButton.className).toContain("bg-foreground");
  });

  it("unselected buttons have default styling (border-zinc-300)", () => {
    render(<LikertScale {...defaultProps} value={3} />);

    const unselectedButton = screen.getByText("5");
    expect(unselectedButton.className).toContain("border-zinc-300");
    expect(unselectedButton.className).not.toContain("bg-foreground");
  });
});
