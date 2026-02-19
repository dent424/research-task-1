import { render, screen, fireEvent } from "@testing-library/react";
import MemeExamples from "@/components/MemeExamples";

describe("MemeExamples", () => {
  const defaultProps = {
    introduction:
      "Below are some examples of internet memes. Please review them before continuing.",
    images: [
      { src: "/memes/example1.jpg", alt: "Example meme 1" },
      { src: "/memes/example2.jpg", alt: "Example meme 2" },
      { src: "/memes/example3.jpg", alt: "Example meme 3" },
    ],
    minViewingSeconds: 0,
    onContinue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the introduction text", () => {
    render(<MemeExamples {...defaultProps} />);

    expect(
      screen.getByText(
        "Below are some examples of internet memes. Please review them before continuing."
      )
    ).toBeInTheDocument();
  });

  it("renders all images with correct src and alt attributes", () => {
    render(<MemeExamples {...defaultProps} />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(3);

    expect(images[0]).toHaveAttribute("src", "/memes/example1.jpg");
    expect(images[0]).toHaveAttribute("alt", "Example meme 1");

    expect(images[1]).toHaveAttribute("src", "/memes/example2.jpg");
    expect(images[1]).toHaveAttribute("alt", "Example meme 2");

    expect(images[2]).toHaveAttribute("src", "/memes/example3.jpg");
    expect(images[2]).toHaveAttribute("alt", "Example meme 3");
  });

  it("clicking Continue calls onContinue", () => {
    const onContinue = vi.fn();
    render(<MemeExamples {...defaultProps} onContinue={onContinue} />);

    fireEvent.click(screen.getByText("Continue"));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
