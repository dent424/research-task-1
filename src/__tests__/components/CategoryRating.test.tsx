import { render, screen, fireEvent } from "@testing-library/react";
import CategoryRating from "@/components/CategoryRating";

// RTL's getByText only checks direct text nodes, not textContent across child
// elements. CategoryRating renders the category name in a <span> child, so we
// need a custom matcher that checks element.textContent (which includes
// descendant text). Restrict to <h3> to avoid matching ancestor elements.
function headingMatching(regex: RegExp) {
  return (_: string, element: Element | null): boolean => {
    return (
      element !== null &&
      element.tagName === "H3" &&
      regex.test(element.textContent ?? "")
    );
  };
}

describe("CategoryRating", () => {
  const defaultProps = {
    category: "Humor",
    question: "How much do you associate {category} with memes?",
    scaleMin: 1,
    scaleMax: 7,
    minLabel: "Not at all",
    maxLabel: "Very much",
    currentIndex: 0,
    totalCount: 14,
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the formatted question with category name inserted", () => {
    render(<CategoryRating {...defaultProps} />);

    // The component lowercases the first char: "Humor" → "humor"
    // and wraps it in a <span>, splitting the text across elements.
    expect(
      screen.getByText(headingMatching(/How much do you associate humor with memes\?/))
    ).toBeInTheDocument();
  });

  it('shows progress indicator ("1 of 14")', () => {
    render(<CategoryRating {...defaultProps} />);

    expect(screen.getByText("1 of 14")).toBeInTheDocument();
  });

  it("Next button is disabled until a value is selected", () => {
    render(<CategoryRating {...defaultProps} />);

    const nextButton = screen.getByText("Next");
    expect(nextButton).toBeDisabled();
  });

  it("selecting a Likert value and clicking Next calls onSubmit with the value", () => {
    const onSubmit = vi.fn();
    render(<CategoryRating {...defaultProps} onSubmit={onSubmit} />);

    // Click the "5" button on the Likert scale
    fireEvent.click(screen.getByText("5"));

    const nextButton = screen.getByText("Next");
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);

    expect(onSubmit).toHaveBeenCalledWith(5);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("the component resets when given a new key (re-rendering with different props)", () => {
    const onSubmit = vi.fn();

    const { rerender } = render(
      <CategoryRating
        {...defaultProps}
        key="category-0"
        category="Humor"
        currentIndex={0}
        onSubmit={onSubmit}
      />
    );

    // Select a value on the first render
    fireEvent.click(screen.getByText("4"));
    expect(screen.getByText("Next")).not.toBeDisabled();

    // Re-render with a new key to simulate moving to the next category
    rerender(
      <CategoryRating
        {...defaultProps}
        key="category-1"
        category="Irony"
        currentIndex={1}
        onSubmit={onSubmit}
      />
    );

    // The component should have reset: Next button disabled again
    expect(screen.getByText("Next")).toBeDisabled();

    // The new category name should appear in the question
    // "Irony" → "irony" (lowercased first char), rendered in a <span>
    expect(
      screen.getByText(headingMatching(/How much do you associate irony with memes\?/))
    ).toBeInTheDocument();

    // Progress should update
    expect(screen.getByText("2 of 14")).toBeInTheDocument();
  });
});
