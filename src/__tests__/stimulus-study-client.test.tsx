import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import StimulusStudyClient from "@/app/stimulus-study-client";
import type { StudyConfig } from "@/lib/study-config";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Deterministic shuffle — identity, so dvOrder = [cringe, authentic, liking]
vi.mock("@/lib/shuffle", () => ({
  shuffle: <T,>(arr: T[]) => [...arr],
  shuffleWithIndex: <T,>(arr: T[]) =>
    arr.map((item: T, originalIndex: number) => ({ item, originalIndex })),
}));

let mockPid: string | null = "P042";
let mockCondition: string | null = "0";
let mockPost: string | null = "1"; // default → stimuli[1] = "blessed"

vi.mock("@/lib/params", () => ({
  getStudyParams: () => {
    const allParams = new URLSearchParams();
    if (mockPost !== null) allParams.set("post", mockPost);
    return {
      participantId: mockPid,
      condition: mockCondition,
      allParams,
    };
  },
}));

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
// Mock config — single-stimulus, 2 cells, 3 DVs (cringe pinned), no comprehension
// ---------------------------------------------------------------------------

const mockConfig: StudyConfig = {
  study: { id: "study5-test", title: "Study 5 Test" },
  comprehensionChecks: [],
  instructions: "You will read a short social media post.",
  scenarioTemplate:
    "Imagine you are scrolling through social media and you see a post from **{actorPhrase}**:",
  stimuli: [
    { id: "iconic", text: "not us being kind of iconic today 💅" },
    { id: "blessed", text: "feeling so blessed today honestly 🥹" },
  ],
  conditions: [
    {
      key: "person",
      actorNoun: "person",
      actorNounPlural: "people",
      actorPhrase: "a person you don't know",
    },
    {
      key: "company",
      actorNoun: "company",
      actorNounPlural: "companies",
      actorPhrase: "a brand you are not familiar with",
    },
  ],
  dependentVariables: [
    {
      id: "cringe",
      label: "cringe",
      questionTemplate: "How **cringe** is this post?",
      scaleMin: 1,
      scaleMax: 7,
      minLabel: "Not at all",
      maxLabel: "Extremely",
    },
    {
      id: "authentic",
      label: "authentic",
      questionTemplate: "How authentic is this post?",
      scaleMin: 1,
      scaleMax: 7,
      minLabel: "Not at all",
      maxLabel: "Extremely",
    },
    {
      id: "liking",
      label: "liking",
      questionTemplate: "How much do you like this post?",
      scaleMin: 1,
      scaleMax: 7,
      minLabel: "Not at all",
      maxLabel: "Extremely",
    },
  ],
  design: {
    type: "single-stimulus",
    dvOrderStrategy: "first-pinned-rest-randomized",
  },
  manipulationCheck: {
    question: "Thinking back to the post you just rated, who posted it?",
    options: ["An individual person", "A company or brand"],
  },
  demographics: {
    age: { label: "What is your age?", placeholder: "Enter your age" },
    gender: { label: "What is your gender?", options: ["Man", "Woman"] },
  },
  qualtricsReturnUrl: "https://test.qualtrics.com/jfe/form/SV_TEST5",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function passConsent() {
  await waitFor(() => expect(screen.getByText("I agree")).toBeInTheDocument());
  await act(async () => {
    fireEvent.click(screen.getByText("I agree"));
  });
}

async function passInstructions() {
  await waitFor(() =>
    expect(
      screen.getByText("You will read a short social media post.")
    ).toBeInTheDocument()
  );
  await act(async () => {
    fireEvent.click(screen.getByText("Continue"));
  });
}

async function rateCurrent(value: number) {
  await waitFor(() => expect(screen.getByText("Next")).toBeInTheDocument());
  await act(async () => {
    fireEvent.click(screen.getByText(String(value)));
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Next"));
  });
}

async function passManipulationCheck(option = "A company or brand") {
  await waitFor(() =>
    expect(screen.getByText(/who posted it\?/)).toBeInTheDocument()
  );
  await act(async () => {
    fireEvent.click(screen.getByLabelText(option));
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Continue"));
  });
}

async function submitDemographics(age = "25", gender = "Woman") {
  await waitFor(() =>
    expect(screen.getByPlaceholderText("Enter your age")).toBeInTheDocument()
  );
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText("Enter your age"), {
      target: { value: age },
    });
  });
  await act(async () => {
    fireEvent.click(screen.getByLabelText(gender));
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Continue"));
  });
}

/** Rate all 3 DVs (cringe, authentic, liking). */
async function rateBattery() {
  await rateCurrent(6);
  await rateCurrent(4);
  await rateCurrent(2);
}

async function completeStudy() {
  await passConsent();
  await passInstructions();
  await rateBattery();
  await passManipulationCheck("A company or brand");
  await submitDemographics("25", "Woman");
}

async function waitForRedirect() {
  await waitFor(() =>
    expect(screen.getByText("Submitting your responses...")).toBeInTheDocument()
  );
  await waitFor(() =>
    expect(Object.keys(lastRedirectData).length).toBeGreaterThan(0)
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mockPid = "P042";
  mockCondition = "0";
  mockPost = "1"; // stimuli[1] = "blessed"
  lastRedirectUrl = "";
  lastRedirectData = {};
  lastRedirectExtra = {};
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ===========================================================================

describe("StimulusStudyClient — single-stimulus between-subjects", () => {
  describe("condition assignment", () => {
    it('cond="0" frames the post as coming from a person you don\'t know', async () => {
      mockCondition = "0";
      await act(async () => {
        render(<StimulusStudyClient config={mockConfig} />);
      });
      await passConsent();
      await passInstructions();
      await waitFor(() =>
        expect(screen.getByTestId("scenario")).toHaveTextContent(
          /you see a post from a person you don't know/
        )
      );
    });

    it('cond="1" frames the post as an unfamiliar brand, same post text', async () => {
      mockCondition = "1";
      await act(async () => {
        render(<StimulusStudyClient config={mockConfig} />);
      });
      await passConsent();
      await passInstructions();
      await waitFor(() =>
        expect(screen.getByTestId("scenario")).toHaveTextContent(
          /you see a post from a brand you are not familiar with/
        )
      );
      expect(screen.getByTestId("post-text")).toHaveTextContent(
        "feeling so blessed today honestly"
      );
    });

    it.each([null, "", "99", "abc"])(
      "invalid cond=%j falls back to a RANDOM cell (never coerced to index 0)",
      async (badCond) => {
        mockCondition = badCond;
        // Math.random -> 0.7, len 2 -> floor(1.4) = index 1 (company).
        // Coercion-to-0 would instead yield index 0 (person).
        vi.spyOn(Math, "random").mockReturnValue(0.7);

        await act(async () => {
          render(<StimulusStudyClient config={mockConfig} />);
        });
        await passConsent();
        await passInstructions();
        await waitFor(() =>
          expect(screen.getByTestId("scenario")).toHaveTextContent(
            /you see a post from a brand you are not familiar with/
          )
        );

        await rateBattery();
        await passManipulationCheck();
        await submitDemographics();
        await waitForRedirect();

        expect(lastRedirectData.condIndex).toBe(1);
        expect(lastRedirectData.conditionKey).toBe("company");
        expect(lastRedirectData.condFromUrl).toBe(false);
      }
    );
  });

  describe("plural actor token", () => {
    // One DV whose template uses {actors} (plural) — rendered as the first
    // (and only) rating page so we can assert on it directly.
    const pluralConfig: StudyConfig = {
      ...mockConfig,
      dependentVariables: [
        {
          id: "expect_standard",
          label: "expectations (standard)",
          questionTemplate:
            "I hold {actors} to a higher standard than this post.",
          scaleMin: 1,
          scaleMax: 7,
          minLabel: "Strongly disagree",
          maxLabel: "Strongly agree",
        },
      ],
    };

    it('cond="0" renders {actors} as "people"', async () => {
      mockCondition = "0";
      await act(async () => {
        render(<StimulusStudyClient config={pluralConfig} />);
      });
      await passConsent();
      await passInstructions();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", {
            name: /I hold people to a higher standard than this post\./,
          })
        ).toBeInTheDocument()
      );
    });

    it('cond="1" renders {actors} as "companies"', async () => {
      mockCondition = "1";
      await act(async () => {
        render(<StimulusStudyClient config={pluralConfig} />);
      });
      await passConsent();
      await passInstructions();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", {
            name: /I hold companies to a higher standard than this post\./,
          })
        ).toBeInTheDocument()
      );
    });
  });

  describe("instructions page", () => {
    it("resolves {actorPhrase} in the instructions text", async () => {
      const introConfig: StudyConfig = {
        ...mockConfig,
        instructions:
          "Imagine you are scrolling through social media and you see a post from **{actorPhrase}**.\n\nYou will answer a few questions about it.",
      };
      mockCondition = "1";
      await act(async () => {
        render(<StimulusStudyClient config={introConfig} />);
      });
      await passConsent();
      // The phrase is bolded, so it renders as its own <strong> element.
      await waitFor(() =>
        expect(
          screen.getByText("a brand you are not familiar with")
        ).toBeInTheDocument()
      );
      expect(screen.queryByText(/\{actorPhrase\}/)).not.toBeInTheDocument();
    });
  });

  describe("statement preamble", () => {
    it("passes a DV's preamble through to the rating page", async () => {
      const preambleConfig: StudyConfig = {
        ...mockConfig,
        dependentVariables: [
          {
            id: "pk_motive",
            label: "persuasion-knowledge (motive)",
            questionTemplate:
              "Whoever posted this has an ulterior motive for posting it.",
            preamble:
              "How much do you disagree or agree with the following statement",
            scaleMin: 1,
            scaleMax: 7,
            minLabel: "Strongly disagree",
            maxLabel: "Strongly agree",
          },
        ],
      };
      await act(async () => {
        render(<StimulusStudyClient config={preambleConfig} />);
      });
      await passConsent();
      await passInstructions();
      await waitFor(() =>
        expect(screen.getByTestId("preamble")).toHaveTextContent(
          "How much do you disagree or agree with the following statement"
        )
      );
    });
  });

  describe("DV ordering", () => {
    it("cringe is the first rating page and is pinned at dvOrder[0]", async () => {
      await act(async () => {
        render(<StimulusStudyClient config={mockConfig} />);
      });
      await passConsent();
      await passInstructions();

      await waitFor(() =>
        expect(
          screen.getByRole("heading", {
            name: /How cringe is this post\?/,
          })
        ).toBeInTheDocument()
      );
      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      await rateBattery();
      await passManipulationCheck();
      await submitDemographics();
      await waitForRedirect();

      const dvOrder = lastRedirectData.dvOrder as string[];
      expect(dvOrder[0]).toBe("cringe");
      expect(dvOrder).toEqual(["cringe", "authentic", "liking"]);
      expect(lastRedirectData.cringePinned).toBe(true);
    });
  });

  describe("flow", () => {
    it("goes straight from consent to instructions (no comprehension check)", async () => {
      await act(async () => {
        render(<StimulusStudyClient config={mockConfig} />);
      });
      await passConsent();
      await waitFor(() =>
        expect(
          screen.getByText("You will read a short social media post.")
        ).toBeInTheDocument()
      );
    });

    it("manipulation check appears AFTER the full DV battery", async () => {
      await act(async () => {
        render(<StimulusStudyClient config={mockConfig} />);
      });
      await passConsent();
      await passInstructions();
      await rateBattery();
      await waitFor(() =>
        expect(screen.getByText(/who posted it\?/)).toBeInTheDocument()
      );
    });
  });

  describe("payload", () => {
    it("has non-empty cond/conditionKey/post/dvOrder, flat ratings, manipulationCheck, totalMs > 0", async () => {
      await act(async () => {
        render(<StimulusStudyClient config={mockConfig} />);
      });
      await completeStudy();
      await waitForRedirect();

      expect(lastRedirectData.pid).toBe("P042");
      expect(lastRedirectData.cond).toBe("0"); // raw URL value
      expect(lastRedirectData.condIndex).toBe(0);
      expect(lastRedirectData.conditionKey).toBe("person");
      expect(lastRedirectData.condFromUrl).toBe(true);
      expect(lastRedirectData.postIndex).toBe(1);
      expect(lastRedirectData.postId).toBe("blessed");
      expect(lastRedirectData.postFromUrl).toBe(true);
      expect(lastRedirectData.dvOrder).toEqual(["cringe", "authentic", "liking"]);

      const ratings = lastRedirectData.ratings as Record<string, number>;
      expect(ratings).toEqual({ cringe: 6, authentic: 4, liking: 2 });

      expect(lastRedirectData.manipulationCheck).toBe("A company or brand");
      expect(lastRedirectData.completed).toBe(true);

      const timing = lastRedirectData.timing as Record<string, number>;
      expect(timing.totalMs).toBeGreaterThan(0);

      expect(lastRedirectData.age).toBe("25");
      expect(lastRedirectData.gender).toBe("Woman");
      expect(lastRedirectExtra.age).toBe("25");
      expect(lastRedirectExtra.gender).toBe("Woman");
      expect(lastRedirectUrl).toBe("https://test.qualtrics.com/jfe/form/SV_TEST5");
    });
  });

  describe("already-completed", () => {
    it("shows the already-completed screen on a second visit", async () => {
      localStorage.setItem("study5-test_completed", "true");
      await act(async () => {
        render(<StimulusStudyClient config={mockConfig} />);
      });
      await waitFor(() =>
        expect(screen.getByText("Study Already Completed")).toBeInTheDocument()
      );
    });
  });
});
