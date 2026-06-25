import { loadStudyConfig, type StudyConfig } from "@/lib/study-config";

// Contract test for study6.yaml. Encodes the Study 6 spec as executable
// assertions: cringe measured FIRST (the Study 5 measure), then authenticity
// (the Study 6 pretest measure, verbatim), for Coleman vs. Patagonia only,
// using the pretest Earth Day tweet — with every other pretest measure dropped.
//
// Loads the REAL config through loadStudyConfig (vitest runs from app/, so
// process.cwd() resolves src/studies/study6.yaml). Fails until that file exists.

// The single stimulus must be byte-identical to the pretest post
// (study6_pretest.yaml) so the brand contrast is the only thing that changes.
const EARTHDAY_TWEET =
  "Happy Earth Day 🌎 There's no Planet B. Let's all do our part. 💚";

describe("study6.yaml config contract", () => {
  let config: StudyConfig;
  let prevActiveStudy: string | undefined;

  beforeAll(() => {
    prevActiveStudy = process.env.ACTIVE_STUDY;
    process.env.ACTIVE_STUDY = "study6";
    config = loadStudyConfig();
  });

  afterAll(() => {
    if (prevActiveStudy === undefined) delete process.env.ACTIVE_STUDY;
    else process.env.ACTIVE_STUDY = prevActiveStudy;
  });

  it("is a single-stimulus study that pins cringe first", () => {
    expect(config.study.id).toBe("study6");
    expect(config.design.type).toBe("single-stimulus");
    expect(config.design.dvOrderStrategy).toBe("first-pinned-rest-randomized");
  });

  it("has exactly the two brand conditions: Coleman then Patagonia", () => {
    const conditions = config.conditions ?? [];
    expect(conditions.map((c) => c.key)).toEqual(["coleman", "patagonia"]);
    expect(conditions.map((c) => c.actorNoun)).toEqual([
      "Coleman",
      "Patagonia",
    ]);
  });

  it("uses the pretest Earth Day tweet as the single stimulus", () => {
    const stimuli = config.stimuli ?? [];
    expect(stimuli).toHaveLength(1);
    expect(stimuli[0].text).toBe(EARTHDAY_TWEET);
  });

  it("measures exactly cringe then authenticity — no other measures", () => {
    expect(config.dependentVariables.map((d) => d.id)).toEqual([
      "cringe",
      "authentic",
    ]);
    // The dropped pretest measures must not reappear.
    for (const dropped of ["env_friendly", "familiarity", "liking"]) {
      expect(config.dependentVariables.some((d) => d.id === dropped)).toBe(
        false
      );
    }
  });

  it("pins cringe first with the Study 5 measure (no preamble, post shown)", () => {
    const cringe = config.dependentVariables[0];
    expect(cringe.id).toBe("cringe");
    expect(cringe.preamble).toBeUndefined();
    expect(cringe.hideStimulus).toBeFalsy();
    expect(cringe.questionTemplate).toBe("How __cringe__ is this post?"); // "cringe" underlined
    expect(cringe.scaleMin).toBe(1);
    expect(cringe.scaleMax).toBe(7);
    expect(cringe.minLabel).toBe("Not at all");
    expect(cringe.maxLabel).toBe("Extremely");
  });

  it("uses the authenticity item: 'How authentic does this post feel?' ('authentic' underlined)", () => {
    const authentic = config.dependentVariables.find(
      (d) => d.id === "authentic"
    );
    expect(authentic).toBeDefined();
    expect(authentic?.preamble).toBeUndefined(); // standalone question, no lead-in
    expect(authentic?.questionTemplate).toBe(
      "How __authentic__ does this post feel?"
    );
    expect(authentic?.minLabel).toBe("Not at all authentic");
    expect(authentic?.maxLabel).toBe("Extremely authentic");
    expect(authentic?.scaleMin).toBe(1);
    expect(authentic?.scaleMax).toBe(7);
  });

  it("shows a recognition check with the five outdoor brands plus 'I'm not sure'", () => {
    const options = config.manipulationCheck?.options ?? [];
    for (const brand of [
      "Patagonia",
      "REI",
      "Yeti",
      "Igloo",
      "Coleman",
      "I'm not sure",
    ]) {
      expect(options).toContain(brand);
    }
  });

  it("has a qualtricsReturnUrl set", () => {
    expect(typeof config.qualtricsReturnUrl).toBe("string");
    expect(config.qualtricsReturnUrl.length).toBeGreaterThan(0);
  });

  it("gates entry with a task-comprehension check that boots after a second failure", () => {
    // The situation description now lives in the comprehension check, so there
    // is no separate instructions page.
    expect(config.instructions).toBeUndefined();
    expect(config.comprehensionChecks).toHaveLength(1);
    const check = config.comprehensionChecks[0];
    expect(check.definition.length).toBeGreaterThan(0);
    expect(check.question.length).toBeGreaterThan(0);
    expect(check.maxAttempts).toBe(2); // allow one failure, boot on the second
    expect((check.kickWarning ?? "").length).toBeGreaterThan(0);
    // exactly one correct option, with at least three options total
    expect(check.options.filter((o) => o.correct)).toHaveLength(1);
    expect(check.options.length).toBeGreaterThanOrEqual(3);
  });
});
