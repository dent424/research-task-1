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

  describe("statements-last grouping", () => {
    const STATEMENT_INTRO =
      "Next, you'll rate how much you disagree or agree with a series of statements.";

    // cringe (pinned) + two non-statement DVs (no preamble) + two agree/disagree
    // statement DVs (with preamble). With shuffle mocked to identity the realized
    // order is [cringe, authentic, liking, sincere, pk_motive].
    const groupedConfig: StudyConfig = {
      ...mockConfig,
      dependentVariables: [
        {
          id: "cringe",
          label: "cringe",
          questionTemplate: "How cringe is this post?",
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
          minLabel: "Not at all authentic",
          maxLabel: "Extremely authentic",
        },
        {
          id: "liking",
          label: "liking",
          questionTemplate: "How much do you like this post?",
          scaleMin: 1,
          scaleMax: 7,
          minLabel: "Dislike a great deal",
          maxLabel: "Like a great deal",
        },
        {
          id: "sincere",
          label: "sincere",
          questionTemplate: "Whoever posted this seems sincere.",
          preamble:
            "How much do you disagree or agree with the following statement:",
          scaleMin: 1,
          scaleMax: 7,
          minLabel: "Strongly disagree",
          maxLabel: "Strongly agree",
        },
        {
          id: "pk_motive",
          label: "persuasion-knowledge (motive)",
          questionTemplate:
            "Whoever posted this has an ulterior motive for posting it.",
          preamble:
            "How much do you disagree or agree with the following statement:",
          scaleMin: 1,
          scaleMax: 7,
          minLabel: "Strongly disagree",
          maxLabel: "Strongly agree",
        },
      ],
      design: {
        type: "single-stimulus",
        dvOrderStrategy: "first-pinned-statements-last",
        statementIntroText: STATEMENT_INTRO,
      },
    };

    it("shows non-statement DVs, then a statement-intro screen, then statement DVs", async () => {
      await act(async () => {
        render(<StimulusStudyClient config={groupedConfig} />);
      });
      await passConsent();
      await passInstructions();

      // 1. cringe (pinned first) — no transition yet
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /How cringe is this post\?/ })
        ).toBeInTheDocument()
      );
      expect(screen.getByText("1 of 5")).toBeInTheDocument();
      expect(screen.queryByText(STATEMENT_INTRO)).not.toBeInTheDocument();
      await rateCurrent(6);

      // 2. authentic — still no transition between non-statement items
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /How authentic is this post\?/ })
        ).toBeInTheDocument()
      );
      expect(screen.getByText("2 of 5")).toBeInTheDocument();
      expect(screen.queryByText(STATEMENT_INTRO)).not.toBeInTheDocument();
      await rateCurrent(5);

      // 3. liking — last non-statement item
      await waitFor(() =>
        expect(
          screen.getByRole("heading", {
            name: /How much do you like this post\?/,
          })
        ).toBeInTheDocument()
      );
      expect(screen.getByText("3 of 5")).toBeInTheDocument();
      await rateCurrent(4);

      // 4. transition screen (not a rating page — no scale "Next" control)
      await waitFor(() =>
        expect(screen.getByText(STATEMENT_INTRO)).toBeInTheDocument()
      );
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByText("Continue"));
      });

      // 5. first agree/disagree statement DV, with its preamble
      await waitFor(() =>
        expect(
          screen.getByRole("heading", {
            name: /Whoever posted this seems sincere\./,
          })
        ).toBeInTheDocument()
      );
      expect(screen.getByTestId("preamble")).toHaveTextContent(
        "How much do you disagree or agree"
      );
      expect(screen.getByText("4 of 5")).toBeInTheDocument();
    });

    it("records the grouped dvOrder and flat ratings in the payload", async () => {
      await act(async () => {
        render(<StimulusStudyClient config={groupedConfig} />);
      });
      await passConsent();
      await passInstructions();
      await rateCurrent(6); // cringe
      await rateCurrent(5); // authentic
      await rateCurrent(4); // liking
      await act(async () => {
        fireEvent.click(screen.getByText("Continue")); // statement-intro
      });
      await rateCurrent(3); // sincere
      await rateCurrent(2); // pk_motive
      await passManipulationCheck();
      await submitDemographics();
      await waitForRedirect();

      expect(lastRedirectData.dvOrder).toEqual([
        "cringe",
        "authentic",
        "liking",
        "sincere",
        "pk_motive",
      ]);
      const ratings = lastRedirectData.ratings as Record<string, number>;
      expect(ratings).toEqual({
        cringe: 6,
        authentic: 5,
        liking: 4,
        sincere: 3,
        pk_motive: 2,
      });
    });
  });

  describe("hideStimulus DV", () => {
    // env_friendly hides the post (a pre-stimulus brand belief); authentic shows
    // it. With shuffle mocked to identity the order is [env_friendly, authentic].
    const hideConfig: StudyConfig = {
      ...mockConfig,
      scenarioTemplate: "Imagine you saw the following post from {actor}:",
      dependentVariables: [
        {
          id: "env_friendly",
          label: "environmental friendliness",
          questionTemplate: "How environmentally friendly is {actor}?",
          hideStimulus: true,
          scaleMin: 1,
          scaleMax: 7,
          minLabel: "Not at all",
          maxLabel: "Extremely",
        },
        {
          id: "authentic",
          label: "authentic",
          questionTemplate: "If {actor} posted this, how authentic would it feel?",
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
    };

    it("hides the post and scenario on a hideStimulus DV, shows them on a normal DV", async () => {
      mockCondition = "0"; // actorNoun "person"
      await act(async () => {
        render(<StimulusStudyClient config={hideConfig} />);
      });
      await passConsent();
      await passInstructions();

      // Page 1: env_friendly — no post text, no scenario.
      await waitFor(() =>
        expect(
          screen.getByRole("heading", {
            name: /How environmentally friendly is person\?/,
          })
        ).toBeInTheDocument()
      );
      expect(screen.queryByTestId("post-text")).not.toBeInTheDocument();
      expect(screen.queryByTestId("scenario")).not.toBeInTheDocument();
      await rateCurrent(5);

      // Page 2: authentic — post text and scenario are shown.
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /how authentic would it feel/ })
        ).toBeInTheDocument()
      );
      expect(screen.getByTestId("post-text")).toHaveTextContent(
        "feeling so blessed today honestly"
      );
      expect(screen.getByTestId("scenario")).toHaveTextContent(
        /you saw the following post from person/
      );
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

// ===========================================================================
// Study 6 shape: brand logos on the task page + post card, and a brand-familiarity
// question between the attention check and demographics. A SEPARATE config — the
// base mockConfig above must stay free of brandFamiliarity so its flow helpers
// (completeStudy/submitDemographics) still reach demographics directly.
// ===========================================================================

describe("StimulusStudyClient — brand logo + familiarity (Study 6 shape)", () => {
  const brandConfig: StudyConfig = {
    ...mockConfig,
    comprehensionChecks: [
      {
        id: "task",
        definition: "In this task you'll see a post from **{actor}** and answer questions.",
        question: "What is this task about?",
        options: [
          { text: "Reading a post and reacting to it", correct: true },
          { text: "Writing posts", correct: false },
          { text: "Rating products", correct: false },
        ],
        retryMessage: "Try again.",
        maxAttempts: 2,
        kickWarning: "One more wrong answer and you're out.",
      },
    ],
    instructions: undefined, // Study 6 has no instructions page
    scenarioTemplate: "Imagine **{actor}** posted this on social media:",
    conditions: [
      {
        key: "coleman",
        actorNoun: "Coleman",
        logo: "/images/study6/coleman.svg",
        logoAlt: "Coleman logo",
      },
      {
        key: "patagonia",
        actorNoun: "Patagonia",
        logo: "/images/study6/patagonia.svg",
        logoAlt: "Patagonia logo",
      },
    ],
    dependentVariables: [
      {
        id: "cringe",
        label: "cringe",
        questionTemplate: "How cringe is this post?",
        scaleMin: 1,
        scaleMax: 7,
        minLabel: "Not at all",
        maxLabel: "Extremely",
      },
      {
        id: "authentic",
        label: "authentic",
        questionTemplate: "How authentic does this post feel?",
        scaleMin: 1,
        scaleMax: 7,
        minLabel: "Not at all authentic",
        maxLabel: "Extremely authentic",
      },
    ],
    design: {
      type: "single-stimulus",
      dvOrderStrategy: "first-pinned-rest-randomized",
    },
    manipulationCheck: {
      question: "Which company's post did you just rate?",
      options: ["Patagonia", "Coleman", "I'm not sure"],
    },
    brandFamiliarity: {
      question: "Before today, had you heard of **{actor}**?",
      options: ["Yes", "No", "Not sure"],
    },
  };

  async function passComprehensionCheck() {
    await waitFor(() => expect(screen.getByText("Submit")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("Reading a post and reacting to it"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Submit"));
    });
  }

  async function passManip(option: string) {
    await waitFor(() =>
      expect(
        screen.getByText(/Which company's post did you just rate\?/)
      ).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText(option));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Continue"));
    });
  }

  it("names the brand in text (no logo) on the task page, shows the logo on the post card, then asks familiarity after the attention check", async () => {
    mockCondition = "0"; // Coleman
    await act(async () => {
      render(<StimulusStudyClient config={brandConfig} />);
    });

    await passConsent();

    // Task/comprehension page identifies the brand in TEXT (no logo here):
    // {actor} resolves to "Coleman", rendered BOLD, with no brand logo.
    await waitFor(() =>
      expect(screen.getByText("What is this task about?")).toBeInTheDocument()
    );
    const brandMention = screen.getByText("Coleman");
    expect(brandMention.tagName).toBe("STRONG");
    expect(document.body.textContent).not.toContain("**"); // markdown rendered, not literal
    expect(screen.queryByText(/\{actor\}/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("brand-logo")).not.toBeInTheDocument();
    await passComprehensionCheck();

    // Rating page renders the post as a social-media card with the logo header.
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /How cringe is this post\?/ })
      ).toBeInTheDocument()
    );
    expect(screen.getByTestId("post-card")).toBeInTheDocument();
    expect(screen.getByTestId("brand-logo")).toBeInTheDocument();

    await rateCurrent(6); // cringe
    await rateCurrent(3); // authentic

    // Attention check, then the familiarity question naming the brand.
    await passManip("Coleman");
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /heard of Coleman/ })
      ).toBeInTheDocument()
    );
    expect(screen.queryByText(/\{actor\}/)).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Not sure"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Continue"));
    });

    await submitDemographics("30", "Woman");
    await waitForRedirect();

    expect(lastRedirectData.brandFamiliarity).toBe("Not sure");
  });

  it("skips the familiarity question when brandFamiliarity is not configured", async () => {
    const noFamiliarity: StudyConfig = {
      ...brandConfig,
      brandFamiliarity: undefined,
    };
    mockCondition = "0";
    await act(async () => {
      render(<StimulusStudyClient config={noFamiliarity} />);
    });
    await passConsent();
    await passComprehensionCheck();
    await rateCurrent(6);
    await rateCurrent(3);
    await passManip("Coleman");
    // Straight to demographics — no familiarity heading.
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter your age")).toBeInTheDocument()
    );
    expect(
      screen.queryByRole("heading", { name: /heard of/ })
    ).not.toBeInTheDocument();
  });
});
