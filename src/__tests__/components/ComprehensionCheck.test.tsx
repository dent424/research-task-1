import { render, screen, fireEvent } from "@testing-library/react";
import ComprehensionCheck from "@/components/ComprehensionCheck";

describe("ComprehensionCheck", () => {
  const defaultProps = {
    definition: "A meme is an image with text that is shared online.",
    question: "What is a meme?",
    options: [
      { text: "An image with text shared online", correct: true },
      { text: "A type of video game", correct: false },
      { text: "A cooking recipe", correct: false },
      { text: "A musical instrument", correct: false },
    ],
    retryMessage: "That is not correct. Please re-read the definition and try again.",
    onPass: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the definition text", () => {
    render(<ComprehensionCheck {...defaultProps} />);

    expect(
      screen.getByText("A meme is an image with text that is shared online.")
    ).toBeInTheDocument();
  });

  it("renders the question", () => {
    render(<ComprehensionCheck {...defaultProps} />);

    expect(screen.getByText("What is a meme?")).toBeInTheDocument();
  });

  it("renders all option buttons", () => {
    render(<ComprehensionCheck {...defaultProps} />);

    expect(screen.getByText("An image with text shared online")).toBeInTheDocument();
    expect(screen.getByText("A type of video game")).toBeInTheDocument();
    expect(screen.getByText("A cooking recipe")).toBeInTheDocument();
    expect(screen.getByText("A musical instrument")).toBeInTheDocument();
  });

  it("submit button is disabled when nothing is selected", () => {
    render(<ComprehensionCheck {...defaultProps} />);

    const submitButton = screen.getByText("Submit");
    expect(submitButton).toBeDisabled();
  });

  it("selecting an option enables the submit button", () => {
    render(<ComprehensionCheck {...defaultProps} />);

    fireEvent.click(screen.getByText("A type of video game"));

    const submitButton = screen.getByText("Submit");
    expect(submitButton).not.toBeDisabled();
  });

  it("submitting the correct answer calls onPass", () => {
    const onPass = vi.fn();
    render(<ComprehensionCheck {...defaultProps} onPass={onPass} />);

    fireEvent.click(screen.getByText("An image with text shared online"));
    fireEvent.click(screen.getByText("Submit"));

    expect(onPass).toHaveBeenCalledTimes(1);
  });

  it("submitting a wrong answer shows the retry message", () => {
    render(<ComprehensionCheck {...defaultProps} />);

    // Retry message should not be visible initially
    expect(
      screen.queryByText(
        "That is not correct. Please re-read the definition and try again."
      )
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("A type of video game"));
    fireEvent.click(screen.getByText("Submit"));

    expect(
      screen.getByText(
        "That is not correct. Please re-read the definition and try again."
      )
    ).toBeInTheDocument();
  });

  it("submitting a wrong answer clears the selection (submit button disabled again)", () => {
    render(<ComprehensionCheck {...defaultProps} />);

    fireEvent.click(screen.getByText("A cooking recipe"));
    fireEvent.click(screen.getByText("Submit"));

    const submitButton = screen.getByText("Submit");
    expect(submitButton).toBeDisabled();
  });

  it("options are shuffled (order is not guaranteed to be the original)", () => {
    // Mock Math.random to produce a specific shuffle that reverses the order.
    // With Fisher-Yates and 4 elements (indices 3,2,1):
    //   i=3: j = floor(random * 4) => we want j=0 => random must be in [0, 0.25)
    //   i=2: j = floor(random * 3) => we want j=0 => random must be in [0, 0.333)
    //   i=1: j = floor(random * 2) => we want j=0 => random must be in [0, 0.5)
    // This would swap index 3<->0, then 2<->0 (now holding original 3), then 1<->0
    // Resulting order: [3, 0, 1, 2] by original index (reversed first, then shifted)
    const mockRandom = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.1) // i=3: j=0
      .mockReturnValueOnce(0.1) // i=2: j=0
      .mockReturnValueOnce(0.1); // i=1: j=0

    render(<ComprehensionCheck {...defaultProps} />);

    const buttons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent !== "Submit"
    );

    // With the mock above, the first option button should NOT be
    // "An image with text shared online" (which was originally at index 0)
    // because the shuffle moved items around.
    const firstOptionText = buttons[0].textContent;
    const lastOptionText = buttons[buttons.length - 1].textContent;

    // The original order was: correct, video game, cooking, musical instrument
    // After shuffle with j=0 each time:
    //   Start: [correct(0), video(1), cooking(2), musical(3)]
    //   i=3, j=0: swap 3<->0 => [musical(3), video(1), cooking(2), correct(0)]
    //   i=2, j=0: swap 2<->0 => [cooking(2), video(1), musical(3), correct(0)]
    //   i=1, j=0: swap 1<->0 => [video(1), cooking(2), musical(3), correct(0)]
    expect(firstOptionText).toBe("A type of video game");
    expect(lastOptionText).toBe("An image with text shared online");

    mockRandom.mockRestore();
  });
});
