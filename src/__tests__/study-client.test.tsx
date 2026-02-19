import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import StudyClient from "@/app/study-client";
import type { StudyConfig } from "@/lib/study-config";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Make shuffle deterministic -- return the array in its original order
vi.mock("@/lib/shuffle", () => ({
  shuffle: <T,>(arr: T[]) => [...arr],
  shuffleWithIndex: <T,>(arr: T[]) =>
    arr.map((item: T, originalIndex: number) => ({ item, originalIndex })),
}));

// Mock getStudyParams to return controlled values
vi.mock("@/lib/params", () => ({
  getStudyParams: () => ({
    participantId: "P001",
    condition: "treatment",
    allParams: new URLSearchParams("pid=P001&cond=treatment"),
  }),
}));

// Mock redirectWithEncodedData to capture redirect data instead of navigating.
// jsdom makes window.location non-configurable, so we cannot stub it.
let lastRedirectUrl = "";
let lastRedirectData: Record<string, unknown> = {};
let lastRedirectExtra: Record<string, string> = {};

vi.mock("@/lib/redirect", () => ({
  redirectWithEncodedData: vi.fn(
    (
      url: string,
      data: Record<string, unknown>,
      extra?: Record<string, string>
    ) => {
      lastRedirectUrl = url;
      lastRedirectData = { ...data };
      lastRedirectExtra = extra ? { ...extra } : {};
    }
  ),
}));

// ---------------------------------------------------------------------------
// Mock config (2 categories for speed)
// ---------------------------------------------------------------------------

const mockConfig: StudyConfig = {
  study: { id: "test-study", title: "Test Study" },
  comprehensionChecks: [
    {
      id: "cringe",
      definition: "Test cringe definition",
      question: "What is cringe?",
      options: [
        { text: "Wrong 1", correct: false },
        { text: "Correct answer", correct: true },
        { text: "Wrong 2", correct: false },
        { text: "Wrong 3", correct: false },
      ],
      retryMessage: "Try again",
    },
    {
      id: "meme",
      definition: "Test meme definition",
      question: "What is a meme?",
      options: [
        { text: "Wrong 1", correct: false },
        { text: "Correct answer", correct: true },
        { text: "Wrong 2", correct: false },
        { text: "Wrong 3", correct: false },
      ],
      retryMessage: "Try again",
    },
  ],
  memeExamples: {
    introduction: "Test intro",
    images: [{ src: "/test.png", alt: "test" }],
    minViewingSeconds: 0,
  },
  categories: ["Category A", "Category B"],
  dependentVariables: [
    {
      id: "appropriateness",
      questionTemplate: "How appropriate is {category}?",
      scaleMin: 1,
      scaleMax: 7,
      minLabel: "Not at all",
      maxLabel: "Extremely",
    },
    {
      id: "cringe",
      questionTemplate: "How cringe is {category}?",
      scaleMin: 1,
      scaleMax: 7,
      minLabel: "Not cringe",
      maxLabel: "Very cringe",
    },
  ],
  design: {
    type: "within-subjects",
    categoryOrder: "randomized",
    dvBlocking: "randomized",
    transitionText: "Now answer a different question.",
  },
  qualtricsReturnUrl: "https://test.qualtrics.com/jfe/form/SV_TEST",
};

// ---------------------------------------------------------------------------
// Custom text matcher for split-element text
// ---------------------------------------------------------------------------

// RTL's getByText only checks direct text nodes, not textContent across child
// elements. CategoryRating renders the category name in a <span> child, so we
// need a custom matcher. Restrict to <h3> to avoid matching ancestor elements.
function headingMatching(regex: RegExp) {
  return (_: string, element: Element | null): boolean => {
    return (
      element !== null &&
      element.tagName === "H3" &&
      regex.test(element.textContent ?? "")
    );
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Advance from loading to consent (happens via useEffect). */
async function waitForConsent() {
  await waitFor(() => {
    expect(screen.getByText("I agree")).toBeInTheDocument();
  });
}

/** Click "I agree" to advance past consent. */
async function passConsent() {
  await waitForConsent();
  await act(async () => {
    fireEvent.click(screen.getByText("I agree"));
  });
}

/** Pass a comprehension check by selecting the correct answer and clicking Submit. */
async function passComprehensionCheck() {
  await waitFor(() => {
    expect(screen.getByText("Correct answer")).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Correct answer"));
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Submit"));
  });
}

/** Pass both comprehension checks (cringe then meme). */
async function passBothComprehensionChecks() {
  await passComprehensionCheck(); // cringe
  await passComprehensionCheck(); // meme
}

/** Click Continue on the meme-examples screen. */
async function passMemeExamples() {
  await waitFor(() => {
    expect(screen.getByText("Test intro")).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Continue"));
  });
}

/** Rate a single category in a block: select a Likert value and click Next. */
async function rateCategory(rating: number) {
  await waitFor(() => {
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.click(screen.getByText(String(rating)));
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Next"));
  });
}

/** Navigate all the way through the study to the redirect phase. */
async function completeEntireStudy() {
  await passConsent();
  await passBothComprehensionChecks();
  await passMemeExamples();
  // Block 1: rate both categories
  await rateCategory(5);
  await rateCategory(3);
  // Transition screen
  await waitFor(() => {
    expect(
      screen.getByText("Now answer a different question.")
    ).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Continue"));
  });
  // Block 2: rate both categories
  await rateCategory(6);
  await rateCategory(2);
}

/** Wait for the redirect mock to have captured data. */
async function waitForRedirect() {
  await waitFor(() => {
    expect(
      screen.getByText("Submitting your responses...")
    ).toBeInTheDocument();
  });
  await waitFor(() => {
    expect(Object.keys(lastRedirectData).length).toBeGreaterThan(0);
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  lastRedirectUrl = "";
  lastRedirectData = {};
  lastRedirectExtra = {};

  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ===================================================================
// TEST SUITES
// ===================================================================

describe("StudyClient", () => {
  // -----------------------------------------------------------------
  // Phase transitions
  // -----------------------------------------------------------------

  describe("phase transitions", () => {
    it("initially shows 'Loading...' then transitions to consent form", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });

      // After the useEffect fires, it should move to consent
      await waitFor(() => {
        expect(screen.getByText("I agree")).toBeInTheDocument();
      });
    });

    it("clicking 'I agree' advances to the cringe comprehension check", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();

      await waitFor(() => {
        expect(screen.getByText("What is cringe?")).toBeInTheDocument();
      });
    });

    it("clicking 'I do NOT agree' navigates to /no-consent", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await waitForConsent();

      await act(async () => {
        fireEvent.click(screen.getByText("I do NOT agree"));
      });

      expect(mockPush).toHaveBeenCalledWith("/no-consent");
    });

    it("selecting correct answer on cringe check advances to meme check", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passComprehensionCheck(); // cringe

      await waitFor(() => {
        expect(screen.getByText("What is a meme?")).toBeInTheDocument();
      });
    });

    it("selecting wrong answer on comprehension check shows retry message", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();

      // Wait for cringe comprehension check
      await waitFor(() => {
        expect(screen.getByText("What is cringe?")).toBeInTheDocument();
      });

      // Select a wrong answer
      await act(async () => {
        fireEvent.click(screen.getByText("Wrong 1"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Submit"));
      });

      await waitFor(() => {
        expect(screen.getByText("Try again")).toBeInTheDocument();
      });
    });

    it("passing meme check advances to meme examples screen", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passBothComprehensionChecks();

      await waitFor(() => {
        expect(screen.getByText("Test intro")).toBeInTheDocument();
      });
    });

    it("clicking Continue on meme examples advances to block1", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passBothComprehensionChecks();
      await passMemeExamples();

      // Should show first category in block1 with progress "1 of 2"
      await waitFor(() => {
        expect(screen.getByText("1 of 2")).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------
  // Block1 ratings
  // -----------------------------------------------------------------

  describe("block1 ratings", () => {
    it("shows CategoryRating with progress indicator", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passBothComprehensionChecks();
      await passMemeExamples();

      await waitFor(() => {
        expect(screen.getByText("1 of 2")).toBeInTheDocument();
        // CategoryRating lowercases first char: "Category A" → "category A"
        expect(
          screen.getByText(headingMatching(/How appropriate is category A\?/))
        ).toBeInTheDocument();
      });
    });

    it("submitting a rating advances to the next category", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passBothComprehensionChecks();
      await passMemeExamples();

      // Rate first category
      await rateCategory(4);

      await waitFor(() => {
        expect(screen.getByText("2 of 2")).toBeInTheDocument();
        expect(
          screen.getByText(headingMatching(/How appropriate is category B\?/))
        ).toBeInTheDocument();
      });
    });

    it("finishing all block1 categories shows the transition screen", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passBothComprehensionChecks();
      await passMemeExamples();

      // Rate both categories
      await rateCategory(4);
      await rateCategory(6);

      await waitFor(() => {
        expect(
          screen.getByText("Now answer a different question.")
        ).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------
  // Transition & block2
  // -----------------------------------------------------------------

  describe("transition and block2", () => {
    it("transition shows text and Continue button", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passBothComprehensionChecks();
      await passMemeExamples();
      await rateCategory(4);
      await rateCategory(6);

      await waitFor(() => {
        expect(
          screen.getByText("Now answer a different question.")
        ).toBeInTheDocument();
        expect(screen.getByText("Continue")).toBeInTheDocument();
      });
    });

    it("clicking Continue on transition advances to block2", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passBothComprehensionChecks();
      await passMemeExamples();
      await rateCategory(4);
      await rateCategory(6);

      // Transition
      await waitFor(() => {
        expect(
          screen.getByText("Now answer a different question.")
        ).toBeInTheDocument();
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Continue"));
      });

      // Block2 shows second DV (cringe, since shuffle is identity)
      await waitFor(() => {
        expect(screen.getByText("1 of 2")).toBeInTheDocument();
        expect(
          screen.getByText(headingMatching(/How cringe is category A\?/))
        ).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------
  // Redirect phase
  // -----------------------------------------------------------------

  describe("redirect phase", () => {
    it("shows 'Submitting your responses...' text after completing block2", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();

      await waitFor(() => {
        expect(
          screen.getByText("Submitting your responses...")
        ).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------
  // localStorage
  // -----------------------------------------------------------------

  describe("localStorage", () => {
    it("if localStorage has completion key, shows 'Study Already Completed'", async () => {
      localStorage.setItem("test-study_completed", "true");

      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Study Already Completed")
        ).toBeInTheDocument();
      });
    });

    it("completion key is derived from config study ID, not hardcoded", async () => {
      const altConfig = {
        ...mockConfig,
        study: { id: "alt-study-99", title: "Alt Study" },
      };
      localStorage.setItem("alt-study-99_completed", "true");

      await act(async () => {
        render(<StudyClient config={altConfig} />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Study Already Completed")
        ).toBeInTheDocument();
      });
    });

    it("after completing study, sets localStorage completion key", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();

      await waitFor(() => {
        expect(localStorage.getItem("test-study_completed")).toBe("true");
      });
    });

    it("does not show already-completed if a different study's key is set", async () => {
      localStorage.setItem("other-study_completed", "true");

      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });

      // Should proceed to consent, not show already-completed
      await waitFor(() => {
        expect(screen.getByText("I agree")).toBeInTheDocument();
      });
      expect(screen.queryByText("Study Already Completed")).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------
  // Data encoding & redirect URL
  // -----------------------------------------------------------------

  describe("data encoding in redirect URL", () => {
    it("redirect data contains pid", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();
      await waitForRedirect();

      expect(lastRedirectData.pid).toBe("P001");
    });

    it("redirect URL points to the configured Qualtrics return URL", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();
      await waitForRedirect();

      expect(lastRedirectUrl).toBe(
        "https://test.qualtrics.com/jfe/form/SV_TEST"
      );
    });

    it("redirect data contains expected structure", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();
      await waitForRedirect();

      // Verify top-level fields
      expect(lastRedirectData.pid).toBe("P001");
      expect(lastRedirectData.cond).toBe("treatment");
      expect(lastRedirectData.completed).toBe(true);

      // dvOrder should contain both DV ids
      expect(lastRedirectData.dvOrder).toEqual(
        expect.arrayContaining(["appropriateness", "cringe"])
      );
      expect(lastRedirectData.dvOrder).toHaveLength(2);

      // Category orders should contain both category keys
      expect(lastRedirectData.block1CategoryOrder).toEqual(
        expect.arrayContaining(["category_a", "category_b"])
      );
      expect(lastRedirectData.block2CategoryOrder).toEqual(
        expect.arrayContaining(["category_a", "category_b"])
      );

      // Ratings should have entries for each DV
      const ratings = lastRedirectData.ratings as Record<
        string,
        Record<string, number>
      >;
      expect(ratings).toHaveProperty("appropriateness");
      expect(ratings).toHaveProperty("cringe");

      // Check that actual rating values are present
      // Block1 used first DV (appropriateness): rated 5 and 3
      expect(ratings.appropriateness.category_a).toBe(5);
      expect(ratings.appropriateness.category_b).toBe(3);

      // Block2 used second DV (cringe): rated 6 and 2
      expect(ratings.cringe.category_a).toBe(6);
      expect(ratings.cringe.category_b).toBe(2);

      // Timing data should exist
      const timing = lastRedirectData.timing as Record<string, number>;
      expect(timing).toBeDefined();
      expect(typeof timing.totalMs).toBe("number");
      expect(typeof timing.block1Ms).toBe("number");
      expect(typeof timing.block2Ms).toBe("number");
    });

    it("ratings use the categoryToKey transform (lowercase, underscores)", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();
      await waitForRedirect();

      const ratings = lastRedirectData.ratings as Record<
        string,
        Record<string, number>
      >;

      // "Category A" -> "category_a", "Category B" -> "category_b"
      const appropriatenessKeys = Object.keys(ratings.appropriateness);
      expect(appropriatenessKeys).toContain("category_a");
      expect(appropriatenessKeys).toContain("category_b");

      // Should NOT have original mixed-case/space names
      expect(appropriatenessKeys).not.toContain("Category A");
    });
  });
});
