import { render, screen } from "@testing-library/react";
import StimulusCard from "@/components/StimulusCard";

const POST = "listen up bestie ✨ pure main-character energy 💅";

describe("StimulusCard", () => {
  it("renders label, handle, descriptor, and post text", () => {
    render(
      <StimulusCard
        label="Jordan Rivers"
        handle="@jordan_rivers"
        descriptor="Just posting"
        text={POST}
      />
    );

    expect(screen.getByTestId("card-name")).toHaveTextContent("Jordan Rivers");
    expect(screen.getByTestId("card-handle")).toHaveTextContent(
      "@jordan_rivers"
    );
    expect(screen.getByTestId("card-descriptor")).toHaveTextContent(
      "Just posting"
    );
    expect(screen.getByTestId("post-text")).toHaveTextContent(POST);
  });

  it("falls back to a neutral avatar placeholder when no avatar is given", () => {
    render(<StimulusCard label="Northwind Daily" handle="@northwind_daily" text={POST} />);

    expect(screen.getByTestId("avatar-placeholder")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("omits the descriptor element entirely when descriptor is empty", () => {
    render(<StimulusCard label="X" handle="@x" descriptor="" text={POST} />);
    expect(screen.queryByTestId("card-descriptor")).not.toBeInTheDocument();
  });

  it("is symmetric: with empty descriptors and no avatars, the non-identity DOM is identical across cells", () => {
    const { container: person } = render(
      <StimulusCard label="Jordan Rivers" handle="@jordan_rivers" text={POST} />
    );
    const { container: company } = render(
      <StimulusCard label="Northwind Daily" handle="@northwind_daily" text={POST} />
    );

    const stripIdentity = (root: HTMLElement) => {
      const clone = root.cloneNode(true) as HTMLElement;
      clone
        .querySelectorAll('[data-testid="card-name"],[data-testid="card-handle"]')
        .forEach((el) => (el.textContent = ""));
      return clone.innerHTML;
    };

    // Post text, action row, layout, and placeholders must be byte-identical
    // once name/handle are blanked — the only intended difference is identity.
    expect(stripIdentity(person)).toBe(stripIdentity(company));
  });
});
