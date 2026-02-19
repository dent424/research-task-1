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

// Mutable condition for between-subjects tests
let mockCondition = "0,3";

vi.mock("@/lib/params", () => ({
  getStudyParams: () => ({
    participantId: "P042",
    condition: mockCondition,
    allParams: new URLSearchParams(`pid=P042&cond=${mockCondition}`),
  }),
}));

// Mock redirect to capture data without touching window.location
// (avoids jsdom "Cannot redefine property: location" issue)
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
// Mock config — mirrors study2.yaml but shrunk to 2 categories and 4 traits
// ---------------------------------------------------------------------------

const mockConfig: StudyConfig = {
  study: { id: "study2-test", title: "Study 2 Test" },
  comprehensionChecks: [
    {
      id: "brand-personality",
      definition: "Test brand personality definition",
      question: "What is brand personality?",
      options: [
        { text: "Wrong 1", correct: false },
        { text: "Correct answer", correct: true },
        { text: "Wrong 2", correct: false },
        { text: "Wrong 3", correct: false },
      ],
      retryMessage: "Try again",
      maxAttempts: 2,
      kickWarning: "Last chance warning",
    },
  ],
  // No memeExamples — tests phase skipping
  instructions: "Test instructions text for Study 2.",
  categories: [
    { label: "A video game company", key: "video_games" },
    { label: "A snack foods company", key: "snack_foods" },
  ],
  dependentVariables: [
    {
      id: "young",
      label: "young",
      questionTemplate:
        'To what extent is **"young"** characteristic of {category}?',
      scaleMin: 1,
      scaleMax: 7,
      minLabel: "Not at all characteristic",
      maxLabel: "Very characteristic",
    },
    {
      id: "trendy",
      label: "trendy",
      questionTemplate:
        'To what extent is **"trendy"** characteristic of {category}?',
      scaleMin: 1,
      scaleMax: 7,
      minLabel: "Not at all characteristic",
      maxLabel: "Very characteristic",
    },
    {
      id: "responsible",
      label: "responsible",
      questionTemplate:
        'To what extent is **"responsible"** characteristic of {category}?',
      scaleMin: 1,
      scaleMax: 7,
      minLabel: "Not at all characteristic",
      maxLabel: "Very characteristic",
    },
    {
      id: "upper_class",
      label: "upper class",
      questionTemplate:
        'To what extent is **"upper class"** characteristic of {category}?',
      scaleMin: 1,
      scaleMax: 7,
      minLabel: "Not at all characteristic",
      maxLabel: "Very characteristic",
    },
  ],
  design: {
    type: "between-subjects",
    categoryOrder: "randomized",
    dvBlocking: "randomized",
    blockIntroTemplate:
      'You will now rate each type of company on how **"{trait}"** it is.',
    transitionText:
      'Now you will rate each type of company on how **"{trait}"** it is.',
  },
  demographics: {
    age: { label: "What is your age?", placeholder: "Enter your age" },
    gender: {
      label: "What is your gender?",
      options: ["Man", "Woman", "Non-binary", "Prefer not to say"],
    },
  },
  qualtricsReturnUrl: "https://test.qualtrics.com/jfe/form/SV_TEST2",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * RTL's getByText only checks direct text nodes, NOT textContent from child
 * elements like <strong>. This helper creates a matcher that checks the full
 * textContent of <p> elements, so we can match text that spans across bold
 * children (e.g., block intro with **"{trait}"**).
 */
function paragraphMatching(regex: RegExp) {
  return (_: string, element: Element | null): boolean => {
    return (
      element !== null &&
      element.tagName === "P" &&
      regex.test(element.textContent ?? "")
    );
  };
}

async function waitForConsent() {
  await waitFor(() => {
    expect(screen.getByText("I agree")).toBeInTheDocument();
  });
}

async function passConsent() {
  await waitForConsent();
  await act(async () => {
    fireEvent.click(screen.getByText("I agree"));
  });
}

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

async function passInstructions() {
  await waitFor(() => {
    expect(
      screen.getByText("Test instructions text for Study 2.")
    ).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Continue"));
  });
}

async function passBlockIntro() {
  await waitFor(() => {
    expect(screen.getByText(/You will now rate/)).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Continue"));
  });
}

/** Rate a single category: select a Likert value and click Next. */
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

async function passTransition() {
  await waitFor(() => {
    expect(screen.getByText(/Now you will rate/)).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Continue"));
  });
}

async function submitDemographics(ageValue = "25", genderOption = "Woman") {
  await waitFor(() => {
    expect(
      screen.getByPlaceholderText("Enter your age")
    ).toBeInTheDocument();
  });
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText("Enter your age"), {
      target: { value: ageValue },
    });
  });
  await act(async () => {
    fireEvent.click(screen.getByLabelText(genderOption));
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Continue"));
  });
}

/** Navigate all phases through block2 (before demographics). */
async function navigateToBlock2End() {
  await passConsent();
  await passComprehensionCheck();
  await passInstructions();
  await passBlockIntro();
  // Block 1: rate both categories
  await rateCategory(5);
  await rateCategory(3);
  // Transition
  await passTransition();
  // Block 2: rate both categories
  await rateCategory(6);
  await rateCategory(2);
}

/** Navigate all the way through the study to the redirect phase. */
async function completeEntireStudy() {
  await navigateToBlock2End();
  await submitDemographics("25", "Woman");
}

/** Wait for the redirect mock to have captured data. */
async function waitForRedirect() {
  await waitFor(() => {
    expect(
      screen.getByText("Submitting your responses...")
    ).toBeInTheDocument();
  });
  // Ensure the redirect useEffect has fired and captured data
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
  mockCondition = "0,3"; // Reset to default
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

describe("StudyClient — Study 2 (between-subjects)", () => {
  // -----------------------------------------------------------------
  // Between-subjects condition parsing
  // -----------------------------------------------------------------

  describe("between-subjects condition parsing", () => {
    it('cond="0,3" selects young and upper_class traits', async () => {
      // cond="0,3" → indices 0,3 → young, upper_class
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passComprehensionCheck();
      await passInstructions();

      // Block1-intro should reference "young" (first trait, dvOrder[0])
      await waitFor(() => {
        expect(
          screen.getByText(paragraphMatching(/You will now rate.*"young"/))
        ).toBeInTheDocument();
      });
    });

    it('cond="1,2" selects trendy and responsible traits', async () => {
      mockCondition = "1,2";

      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passComprehensionCheck();
      await passInstructions();

      // Block1-intro should reference "trendy" (first trait at index 1)
      await waitFor(() => {
        expect(
          screen.getByText(paragraphMatching(/You will now rate.*"trendy"/))
        ).toBeInTheDocument();
      });
    });

    it("dvOrder in blob contains exactly the 2 assigned trait IDs", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();
      await waitForRedirect();

      expect(lastRedirectData.dvOrder).toEqual(["young", "upper_class"]);
      expect((lastRedirectData.dvOrder as string[]).length).toBe(2);
    });
  });

  // -----------------------------------------------------------------
  // Phase skipping
  // -----------------------------------------------------------------

  describe("phase skipping", () => {
    it("skips meme-examples (undefined) and goes to instructions", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passComprehensionCheck();

      // Should show instructions, not meme-examples
      await waitFor(() => {
        expect(
          screen.getByText("Test instructions text for Study 2.")
        ).toBeInTheDocument();
      });
    });

    it("goes from instructions to block1-intro when blockIntroTemplate exists", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passComprehensionCheck();
      await passInstructions();

      // Should show block1-intro text, not directly start block1 ratings
      await waitFor(() => {
        expect(screen.getByText(/You will now rate/)).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------
  // Block intro {trait} substitution
  // -----------------------------------------------------------------

  describe("block intro {trait} substitution", () => {
    it("block1 intro replaces {trait} with first trait label", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passComprehensionCheck();
      await passInstructions();

      // Template: 'You will now rate each type of company on how **"{trait}"** it is.'
      // With trait "young" → textContent: '...how "young" it is.'
      await waitFor(() => {
        expect(
          screen.getByText(
            paragraphMatching(/You will now rate.*"young".*it is/)
          )
        ).toBeInTheDocument();
      });
    });

    it('uses label "upper class" not id "upper_class" when they differ', async () => {
      // Put upper_class first: cond="3,0" → dvOrder = ["upper_class", "young"]
      mockCondition = "3,0";

      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passComprehensionCheck();
      await passInstructions();

      // Should show "upper class" (label with space), not "upper_class" (id)
      await waitFor(() => {
        expect(
          screen.getByText(
            paragraphMatching(/You will now rate.*"upper class".*it is/)
          )
        ).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------
  // Transition {trait} substitution
  // -----------------------------------------------------------------

  describe("transition {trait} substitution", () => {
    it("transition text replaces {trait} with second trait label", async () => {
      // Default cond="0,3" → dvOrder = ["young", "upper_class"]
      // Transition substitutes block2's trait = upper_class (label: "upper class")
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();
      await passComprehensionCheck();
      await passInstructions();
      await passBlockIntro();
      await rateCategory(5);
      await rateCategory(3);

      await waitFor(() => {
        expect(
          screen.getByText(
            paragraphMatching(/Now you will rate.*"upper class".*it is/)
          )
        ).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------
  // Demographics phase
  // -----------------------------------------------------------------

  describe("demographics phase", () => {
    it("after block2, advances to demographics (not free-response)", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await navigateToBlock2End();

      // Should show demographics
      await waitFor(() => {
        expect(screen.getByText("What is your age?")).toBeInTheDocument();
        expect(screen.getByText("What is your gender?")).toBeInTheDocument();
      });
    });

    it("submitting demographics advances to redirect", async () => {
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
  // Demographics in blob
  // -----------------------------------------------------------------

  describe("demographics in blob", () => {
    it("decoded blob contains age and gender at top level", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();
      await waitForRedirect();

      expect(lastRedirectData.age).toBe("25");
      expect(lastRedirectData.gender).toBe("Woman");
    });

    it("blob omits age/gender when demographics config is absent", async () => {
      const configNoDemographics = { ...mockConfig, demographics: undefined };

      await act(async () => {
        render(<StudyClient config={configNoDemographics} />);
      });
      // Without demographics, after block2 goes straight to redirect
      await navigateToBlock2End();
      await waitForRedirect();

      expect(lastRedirectData).not.toHaveProperty("age");
      expect(lastRedirectData).not.toHaveProperty("gender");
    });
  });

  // -----------------------------------------------------------------
  // Comprehension check maxAttempts
  // -----------------------------------------------------------------

  describe("comprehension check maxAttempts", () => {
    it("first wrong answer with maxAttempts=2 shows kickWarning", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();

      await waitFor(() => {
        expect(
          screen.getByText("What is brand personality?")
        ).toBeInTheDocument();
      });

      // First wrong answer
      await act(async () => {
        fireEvent.click(screen.getByText("Wrong 1"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Submit"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Last chance warning")
        ).toBeInTheDocument();
      });
    });

    it("second wrong answer triggers failed-check screen", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await passConsent();

      await waitFor(() => {
        expect(
          screen.getByText("What is brand personality?")
        ).toBeInTheDocument();
      });

      // First wrong answer
      await act(async () => {
        fireEvent.click(screen.getByText("Wrong 1"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Submit"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Last chance warning")
        ).toBeInTheDocument();
      });

      // Second wrong answer
      await act(async () => {
        fireEvent.click(screen.getByText("Wrong 2"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Submit"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Unable to Continue")
        ).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------
  // Full end-to-end data structure
  // -----------------------------------------------------------------

  describe("full end-to-end data structure", () => {
    it("complete study produces correct blob with all fields", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();
      await waitForRedirect();

      // Metadata
      expect(lastRedirectData.pid).toBe("P042");
      expect(lastRedirectData.cond).toBe("0,3");
      expect(lastRedirectData.completed).toBe(true);

      // DV order (identity shuffle of ["young", "upper_class"])
      expect(lastRedirectData.dvOrder).toEqual(["young", "upper_class"]);

      // Category orders (identity shuffle → original order, using keys)
      expect(lastRedirectData.block1CategoryOrder).toEqual([
        "video_games",
        "snack_foods",
      ]);
      expect(lastRedirectData.block2CategoryOrder).toEqual([
        "video_games",
        "snack_foods",
      ]);

      // Ratings: block1 = young (rated 5, 3), block2 = upper_class (rated 6, 2)
      const ratings = lastRedirectData.ratings as Record<
        string,
        Record<string, number>
      >;
      expect(ratings.young.video_games).toBe(5);
      expect(ratings.young.snack_foods).toBe(3);
      expect(ratings.upper_class.video_games).toBe(6);
      expect(ratings.upper_class.snack_foods).toBe(2);

      // Timing
      expect(lastRedirectData.timing).toBeDefined();
      const timing = lastRedirectData.timing as Record<string, number>;
      expect(typeof timing.totalMs).toBe("number");
      expect(typeof timing.block1Ms).toBe("number");
      expect(typeof timing.block2Ms).toBe("number");

      // Demographics
      expect(lastRedirectData.age).toBe("25");
      expect(lastRedirectData.gender).toBe("Woman");

      // Redirect URL
      expect(lastRedirectUrl).toBe(
        "https://test.qualtrics.com/jfe/form/SV_TEST2"
      );
    });

    it("category keys use explicit key field from config, not derived from label", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();
      await waitForRedirect();

      const ratings = lastRedirectData.ratings as Record<
        string,
        Record<string, number>
      >;

      // Keys should be "video_games" and "snack_foods" (from config key field)
      // NOT "a_video_game_company" or "a_snack_foods_company" (derived from label)
      const youngKeys = Object.keys(ratings.young);
      expect(youngKeys).toContain("video_games");
      expect(youngKeys).toContain("snack_foods");
      expect(youngKeys).not.toContain("a_video_game_company");
      expect(youngKeys).not.toContain("a_snack_foods_company");
    });
  });

  // -----------------------------------------------------------------
  // No free response
  // -----------------------------------------------------------------

  describe("no free response", () => {
    it("blob does not contain free_response field", async () => {
      await act(async () => {
        render(<StudyClient config={mockConfig} />);
      });
      await completeEntireStudy();
      await waitForRedirect();

      // The study data blob should not have free_response
      expect(lastRedirectData).not.toHaveProperty("free_response");
      // The extra params should also not have free_response
      expect(lastRedirectExtra).not.toHaveProperty("free_response");
    });
  });
});
