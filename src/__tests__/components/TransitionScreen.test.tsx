import { render, screen, fireEvent } from "@testing-library/react";
import TransitionScreen from "@/components/TransitionScreen";

describe("TransitionScreen", () => {
  const defaultProps = {
    text: "You have completed the first part. Next, you will rate some categories.",
    onContinue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the text", () => {
    render(<TransitionScreen {...defaultProps} />);

    expect(
      screen.getByText(
        "You have completed the first part. Next, you will rate some categories."
      )
    ).toBeInTheDocument();
  });

  it("clicking Continue calls onContinue", () => {
    const onContinue = vi.fn();
    render(<TransitionScreen {...defaultProps} onContinue={onContinue} />);

    fireEvent.click(screen.getByText("Continue"));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
