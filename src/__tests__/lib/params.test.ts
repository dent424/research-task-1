import { getQueryParams, getStudyParams } from "@/lib/params";

afterEach(() => {
  vi.unstubAllGlobals();
});

function setSearch(search: string) {
  vi.stubGlobal("location", { search, href: "" });
}

describe("getQueryParams", () => {
  it("returns a URLSearchParams instance", () => {
    setSearch("?foo=bar");
    const result = getQueryParams();
    expect(result).toBeInstanceOf(URLSearchParams);
  });

  it("parses query parameters from window.location.search", () => {
    setSearch("?foo=bar&baz=qux");
    const result = getQueryParams();
    expect(result.get("foo")).toBe("bar");
    expect(result.get("baz")).toBe("qux");
  });

  it("returns empty params when window.location.search is empty", () => {
    setSearch("");
    const result = getQueryParams();
    expect(result.toString()).toBe("");
    expect(result.get("anything")).toBeNull();
  });
});

describe("getStudyParams", () => {
  it("returns participantId and condition from URL", () => {
    setSearch("?pid=PARTICIPANT_123&cond=treatment");
    const { participantId, condition } = getStudyParams();
    expect(participantId).toBe("PARTICIPANT_123");
    expect(condition).toBe("treatment");
  });

  it("returns null for participantId when pid is missing", () => {
    setSearch("?cond=control");
    const { participantId } = getStudyParams();
    expect(participantId).toBeNull();
  });

  it("returns null for condition when cond is missing", () => {
    setSearch("?pid=P001");
    const { condition } = getStudyParams();
    expect(condition).toBeNull();
  });

  it("returns null for both when no params are present", () => {
    setSearch("");
    const { participantId, condition } = getStudyParams();
    expect(participantId).toBeNull();
    expect(condition).toBeNull();
  });

  it("returns allParams as a URLSearchParams object", () => {
    setSearch("?pid=P001&cond=control&extra=value");
    const { allParams } = getStudyParams();
    expect(allParams).toBeInstanceOf(URLSearchParams);
    expect(allParams.get("extra")).toBe("value");
  });

  it("allParams includes pid and cond alongside other params", () => {
    setSearch("?pid=P001&cond=control&session=abc");
    const { allParams } = getStudyParams();
    expect(allParams.get("pid")).toBe("P001");
    expect(allParams.get("cond")).toBe("control");
    expect(allParams.get("session")).toBe("abc");
  });
});
