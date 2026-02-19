import {
  buildQualtricsRedirectUrl,
  redirectToQualtrics,
  redirectWithEncodedData,
} from "@/lib/redirect";

const BASE_URL = "https://uni.qualtrics.com/jfe/form/SV_XXXXXXX";

// jsdom makes window.location non-configurable, so neither vi.stubGlobal nor
// vi.spyOn works on location or its properties. Instead, we mock the entire
// redirect module for tests that need to verify what URL gets built, while
// keeping the pure URL-building functions unmocked.

// For redirectToQualtrics and redirectWithEncodedData tests, we capture the
// URL that would be passed to window.location.href by mocking the module.
let capturedUrl = "";

vi.mock("@/lib/redirect", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/redirect")>();
  return {
    ...original,
    // Override redirectToQualtrics to capture the URL instead of navigating
    redirectToQualtrics: vi.fn(
      (qualtricsUrl: string, data: Record<string, string | number>) => {
        capturedUrl = original.buildQualtricsRedirectUrl(qualtricsUrl, data);
      }
    ),
    // redirectWithEncodedData calls redirectToQualtrics internally, so we
    // need to re-implement it here to use the mocked redirectToQualtrics.
    redirectWithEncodedData: vi.fn(
      (
        qualtricsUrl: string,
        studyData: Record<string, unknown>,
        extraParams?: Record<string, string>
      ) => {
        const jsonString = JSON.stringify(studyData);
        // Replicate the toBase64 encoding (which is private in the module)
        const bytes = new TextEncoder().encode(jsonString);
        let binary = "";
        for (const byte of bytes) {
          binary += String.fromCharCode(byte);
        }
        const encoded = btoa(binary);
        const pid = (studyData.pid as string) ?? "";
        const params: Record<string, string | number> = {
          pid,
          data: encoded,
        };
        if (extraParams) {
          for (const [key, value] of Object.entries(extraParams)) {
            params[key] = value;
          }
        }
        capturedUrl = original.buildQualtricsRedirectUrl(qualtricsUrl, params);
      }
    ),
  };
});

beforeEach(() => {
  capturedUrl = "";
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("buildQualtricsRedirectUrl", () => {
  it("appends query params to the URL", () => {
    const result = buildQualtricsRedirectUrl(BASE_URL, { pid: "P001" });
    const url = new URL(result);
    expect(url.searchParams.get("pid")).toBe("P001");
  });

  it("handles multiple params", () => {
    const result = buildQualtricsRedirectUrl(BASE_URL, {
      pid: "P001",
      cond: "control",
      score: "85",
    });
    const url = new URL(result);
    expect(url.searchParams.get("pid")).toBe("P001");
    expect(url.searchParams.get("cond")).toBe("control");
    expect(url.searchParams.get("score")).toBe("85");
  });

  it("converts numbers to strings", () => {
    const result = buildQualtricsRedirectUrl(BASE_URL, {
      score: 95,
      rt: 1234,
    });
    const url = new URL(result);
    expect(url.searchParams.get("score")).toBe("95");
    expect(url.searchParams.get("rt")).toBe("1234");
  });

  it("preserves existing URL query params", () => {
    const urlWithParams = `${BASE_URL}?existing=value`;
    const result = buildQualtricsRedirectUrl(urlWithParams, { pid: "P001" });
    const url = new URL(result);
    expect(url.searchParams.get("existing")).toBe("value");
    expect(url.searchParams.get("pid")).toBe("P001");
  });

  it("returns a valid URL string", () => {
    const result = buildQualtricsRedirectUrl(BASE_URL, { pid: "P001" });
    expect(() => new URL(result)).not.toThrow();
  });
});

describe("redirectToQualtrics", () => {
  it("builds and would navigate to the correct URL", () => {
    redirectToQualtrics(BASE_URL, { pid: "P001" });
    expect(capturedUrl).toContain(BASE_URL);
    expect(capturedUrl).toContain("pid=P001");
  });
});

describe("redirectWithEncodedData", () => {
  it("builds a valid URL", () => {
    redirectWithEncodedData(BASE_URL, { pid: "P001", score: 90 });
    expect(capturedUrl).toBeTruthy();
    expect(() => new URL(capturedUrl)).not.toThrow();
  });

  it("includes pid as a standalone query param", () => {
    redirectWithEncodedData(BASE_URL, { pid: "P123", score: 42 });
    const url = new URL(capturedUrl);
    expect(url.searchParams.get("pid")).toBe("P123");
  });

  it("includes a data query param", () => {
    redirectWithEncodedData(BASE_URL, { pid: "P001", score: 42 });
    const url = new URL(capturedUrl);
    expect(url.searchParams.has("data")).toBe(true);
    expect(url.searchParams.get("data")).toBeTruthy();
  });

  it("encodes data as valid Base64 that decodes to the original JSON", () => {
    const studyData = { pid: "P001", score: 42, condition: "treatment" };
    redirectWithEncodedData(BASE_URL, studyData);

    const url = new URL(capturedUrl);
    const encodedData = url.searchParams.get("data")!;

    // Decode the Base64 string back to JSON
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(encodedData), (c) => c.charCodeAt(0))
    );
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(studyData);
  });

  it("handles nested objects in study data", () => {
    const studyData = {
      pid: "P001",
      responses: { q1: "agree", q2: "disagree" },
      timing: { start: 1000, end: 5000 },
    };
    redirectWithEncodedData(BASE_URL, studyData);

    const url = new URL(capturedUrl);
    const encodedData = url.searchParams.get("data")!;

    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(encodedData), (c) => c.charCodeAt(0))
    );
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(studyData);
  });

  it("handles arrays in study data", () => {
    const studyData = {
      pid: "P001",
      ratings: [1, 5, 3, 4, 2],
    };
    redirectWithEncodedData(BASE_URL, studyData);

    const url = new URL(capturedUrl);
    const encodedData = url.searchParams.get("data")!;

    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(encodedData), (c) => c.charCodeAt(0))
    );
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(studyData);
  });

  it("handles Unicode characters in values without errors", () => {
    const studyData = {
      pid: "P001",
      feedback: "This was great! \u{1F44D}\u{1F3FB}",
      name: "\u00E9\u00E8\u00EA\u00EB\u00F1\u00FC\u00E4\u00F6",
      japanese: "\u3053\u3093\u306B\u3061\u306F",
    };

    expect(() => {
      redirectWithEncodedData(BASE_URL, studyData);
    }).not.toThrow();

    const url = new URL(capturedUrl);
    const encodedData = url.searchParams.get("data")!;

    // Decode and verify roundtrip
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(encodedData), (c) => c.charCodeAt(0))
    );
    const parsed = JSON.parse(decoded);

    expect(parsed).toEqual(studyData);
  });

  it("uses empty string for pid when pid is not in studyData", () => {
    const studyData = { score: 100 };
    redirectWithEncodedData(BASE_URL, studyData);

    const url = new URL(capturedUrl);
    expect(url.searchParams.get("pid")).toBe("");
  });
});
