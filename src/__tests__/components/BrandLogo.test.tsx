import { render, screen } from "@testing-library/react";
import BrandLogo from "@/components/BrandLogo";

describe("BrandLogo", () => {
  it("renders an img with the given src and alt", () => {
    render(<BrandLogo src="/images/study6/coleman.svg" alt="Coleman logo" />);
    const img = screen.getByTestId("brand-logo");
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "/images/study6/coleman.svg");
    expect(img).toHaveAttribute("alt", "Coleman logo");
  });

  it("fits the logo with object-contain so different aspect ratios stay matched in size", () => {
    render(<BrandLogo src="/images/study6/patagonia.svg" alt="Patagonia logo" />);
    expect(screen.getByTestId("brand-logo").className).toMatch(/object-contain/);
  });

  it("applies a caller-provided className to the box (size override)", () => {
    render(
      <BrandLogo
        src="/images/study6/coleman.svg"
        alt="Coleman logo"
        className="h-7"
      />
    );
    // The override lands on the wrapper that constrains the height.
    expect(screen.getByTestId("brand-logo-box").className).toMatch(/h-7/);
  });
});
