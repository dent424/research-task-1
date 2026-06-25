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

  it("underlines a __word__ in the question (renders a <u> element)", () => {
    renderRating("How __cringe__ is this post?");
    // Full visible text is unchanged...
    expect(
      screen.getByRole("heading", { name: /How cringe is this post\?/ })
    ).toBeInTheDocument();
    // ...and the marked word renders inside a <u>.
    const underlined = screen.getByText("cringe");
    expect(underlined.tagName).toBe("U");
  });

  it("renders a left-justified preamble above the question when provided", () => {
    render(
      <StimulusRating
        scenario={SCENARIO}
        postText={POST_TEXT}
        question="Whoever posted this has an ulterior motive for posting it."
        preamble="How much do you disagree or agree with the following statement"
        scaleMin={1}
        scaleMax={7}
        minLabel="Strongly disagree"
        maxLabel="Strongly agree"
        currentIndex={0}
        totalCount={5}
        onSubmit={vi.fn()}
      />
    );
    const preamble = screen.getByTestId("preamble");
    expect(preamble).toHaveTextContent(
      "How much do you disagree or agree with the following statement"
    );
    expect(preamble.className).toMatch(/text-left/);
  });

  it("omits the preamble element when none is given", () => {
    renderRating("How cringe is this post?");
    expect(screen.queryByTestId("preamble")).not.toBeInTheDocument();
  });

  it("omits the scenario element when no scenario is given", () => {
    renderRating("How cringe is this post?", vi.fn(), "");
    expect(screen.queryByTestId("scenario")).not.toBeInTheDocument();
  });

  it("renders the scenario in gray by default", () => {
    renderRating("How cringe is this post?");
    expect(screen.getByTestId("scenario").className).toMatch(/text-zinc-400/);
  });

  it("renders the scenario in dark text when scenarioColor='black'", () => {
    render(
      <StimulusRating
        scenario={SCENARIO}
        postText={POST_TEXT}
        question="How cringe is this post?"
        scaleMin={1}
        scaleMax={7}
        minLabel="Not at all"
        maxLabel="Extremely"
        scenarioColor="black"
        currentIndex={0}
        totalCount={5}
        onSubmit={vi.fn()}
      />
    );
    const scenario = screen.getByTestId("scenario");
    expect(scenario.className).toMatch(/text-zinc-900/);
    expect(scenario.className).not.toMatch(/text-zinc-400/);
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
