import { render, screen, fireEvent } from "@testing-library/react";
import ConsentForm from "@/components/ConsentForm";

describe("ConsentForm", () => {
  const defaultProps = {
    onAgree: vi.fn(),
    onDecline: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "I agree" and "I do NOT agree" buttons', () => {
    render(<ConsentForm {...defaultProps} />);

    expect(screen.getByText("I agree")).toBeInTheDocument();
    expect(screen.getByText("I do NOT agree")).toBeInTheDocument();
  });

  it('clicking "I agree" calls onAgree', () => {
    const onAgree = vi.fn();
    render(<ConsentForm {...defaultProps} onAgree={onAgree} />);

    fireEvent.click(screen.getByText("I agree"));

    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('clicking "I do NOT agree" calls onDecline', () => {
    const onDecline = vi.fn();
    render(<ConsentForm {...defaultProps} onDecline={onDecline} />);

    fireEvent.click(screen.getByText("I do NOT agree"));

    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("renders the informed consent text", () => {
    render(<ConsentForm {...defaultProps} />);

    // Check for the heading
    expect(screen.getByText("Informed Consent")).toBeInTheDocument();

    // Check for key paragraphs of the consent form
    expect(
      screen.getByText(/This survey is being conducted for the purposes of consumer behavior research/)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/The purpose of this research is to help academics and practitioners/)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/To begin this survey, you will be given an attention-check question/)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/To protect your privacy and confidentiality/)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/If you agree to participate in this research/)
    ).toBeInTheDocument();
  });
});
