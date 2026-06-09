import { render, screen, fireEvent } from "@testing-library/react";
import StimulusRating from "@/components/StimulusRating";

const SCENARIO =
  "Imagine that you are scrolling through social media and you see a **company** make the following post:";
const POST_TEXT = "feeling so blessed today honestly 🥹";

function renderRating(
  question: string,
  onSubmit = vi.fn(),
  scenario = SCENARIO
) {
  render(
    <StimulusRating
      scenario={scenario}
      postText={POST_TEXT}
      question={question}
      scaleMin={1}
      scaleMax={7}
      minLabel="Not at all"
      maxLabel="Extremely"
      currentIndex={0}
      totalCount={5}
      onSubmit={onSubmit}
    />
  );
}

describe("StimulusRating", () => {
  it("renders the scenario framing (with the bolded actor) and the post text", () => {
    renderRating("How **cringe** is this post?");
    expect(screen.getByTestId("scenario")).toHaveTextContent(
      /Imagine that you are scrolling through social media and you see a company/
    );
    expect(screen.getByTestId("post-text")).toHaveTextContent(
      "feeling so blessed today honestly"
    );
  });

  it("renders the question without throwing (no card chrome, no tokens)", () => {
    expect(() => renderRating("How **cringe** is this post?")).not.toThrow();
    expect(
      screen.getByRole("heading", { name: /How cringe is this post\?/ })
    ).toBeInTheDocument();
  });

  it("omits the scenario element when no scenario is given", () => {
    renderRating("How cringe is this post?", vi.fn(), "");
    expect(screen.queryByTestId("scenario")).not.toBeInTheDocument();
  });

  it("disables Next until a value is selected, then submits the value", () => {
    const onSubmit = vi.fn();
    renderRating("How cringe is this post?", onSubmit);

    const next = screen.getByText("Next");
    expect(next).toBeDisabled();

    fireEvent.click(screen.getByText("5"));
    expect(next).not.toBeDisabled();

    fireEvent.click(next);
    expect(onSubmit).toHaveBeenCalledWith(5);
  });
});
