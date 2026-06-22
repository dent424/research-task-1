import { render, screen } from "@testing-library/react";
import { toTwemojiCode, renderWithEmoji } from "@/lib/emoji";

describe("toTwemojiCode", () => {
  // The five emoji used across the study 5 stimuli, with their Twemoji
  // (lowercase hex codepoint) filenames.
  it.each([
    ["💅", "1f485"],
    ["🥹", "1f979"],
    ["🌱", "1f331"],
    ["😭", "1f62d"],
    ["🙏", "1f64f"],
  ])("maps %s to %s", (emoji, code) => {
    expect(toTwemojiCode(emoji)).toBe(code);
  });

  it("drops the VS16 (U+FE0F) variation selector when there is no ZWJ", () => {
    // ❤️ = U+2764 U+FE0F → twemoji strips FE0F → "2764"
    expect(toTwemojiCode("❤️")).toBe("2764");
  });
});

describe("renderWithEmoji", () => {
  it("replaces a trailing emoji with a self-hosted Twemoji image, keeping the text", () => {
    render(<p>{renderWithEmoji("feeling so blessed today honestly 🥹")}</p>);
    const img = screen.getByRole("img", { name: "🥹" });
    expect(img).toHaveAttribute("src", "/twemoji/1f979.svg");
    expect(
      screen.getByText(/feeling so blessed today honestly/)
    ).toBeInTheDocument();
  });

  it("replaces a leading emoji and preserves the following text", () => {
    render(<p>{renderWithEmoji("💅 iconic")}</p>);
    expect(screen.getByRole("img", { name: "💅" })).toHaveAttribute(
      "src",
      "/twemoji/1f485.svg"
    );
    expect(screen.getByText(/iconic/)).toBeInTheDocument();
  });

  it("renders plain text with no emoji unchanged (no images)", () => {
    render(<p>{renderWithEmoji("just some text")}</p>);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
