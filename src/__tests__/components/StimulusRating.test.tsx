import { render, screen, fireEvent } from "@testing-library/react";
import StimulusRating from "@/components/StimulusRating";
import type { StimulusCondition } from "@/lib/study-config";

const POST_TEXT = "pure main-character energy 💅";
const condition: StimulusCondition = {
  key: "person",
  label: "Jordan Rivers",
  handle: "@jordan_rivers",
};

function renderRating(question: string, onSubmit = vi.fn()) {
  render(
    <StimulusRating
      postText={POST_TEXT}
      condition={condition}
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
  it("renders a question that has NO {category} token without throwing", () => {
    expect(() =>
      renderRating("How **cringe** is this post?")
    ).not.toThrow();
    expect(
      screen.getByRole("heading", { name: /How cringe is this post\?/ })
    ).toBeInTheDocument();
  });

  it("keeps the stimulus card pinned above the question", () => {
    renderRating("How cringe is this post?");
    expect(screen.getByTestId("post-text")).toHaveTextContent(
      "pure main-character energy"
    );
    expect(screen.getByTestId("card-name")).toHaveTextContent("Jordan Rivers");
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
