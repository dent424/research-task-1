import yaml from "js-yaml";
import fs from "fs";
import path from "path";

export interface ComprehensionOption {
  text: string;
  correct: boolean;
}

export interface ComprehensionCheck {
  id: string;
  definition: string;
  question: string;
  options: ComprehensionOption[];
  retryMessage: string;
  maxAttempts?: number;
  kickWarning?: string;
}

export interface MemeExampleImage {
  src: string;
  alt: string;
}

export interface MemeExamples {
  introduction: string;
  images: MemeExampleImage[];
  minViewingSeconds: number;
}

export interface DependentVariable {
  id: string;
  label?: string;
  questionTemplate: string;
  scaleMin: number;
  scaleMax: number;
  minLabel: string;
  maxLabel: string;
}

export interface FreeResponseConfig {
  question: string;
  aiWarning: string;
  minChars: number;
  maxChars: number;
  minSeconds: number;
  placeholder: string;
}

export interface DemographicsConfig {
  age: { label: string; placeholder: string };
  gender: { label: string; options: string[] };
}

export interface Category {
  label: string;
  key: string;
}

/**
 * One actor cell for a single-stimulus between-subjects study (e.g. an
 * anonymous person vs. an anonymous company). The `cond` URL param indexes
 * into the `conditions` array. Every text/visual element on one card must have
 * a matched-salience counterpart on the other; the sole intended difference is
 * the person/company identity cue.
 */
export interface StimulusCondition {
  key: string; // e.g. "person" | "company" — stored as conditionKey
  label: string; // display name shown on the card
  handle: string; // e.g. "@jordan_rivers"
  descriptor?: string; // optional bio line — must be matched/empty across cells
  avatar?: string; // optional /images/study5/*.png|svg
  // Noun substituted for {actor} in DV question templates so parallel-worded
  // items differ only by the actor noun, e.g. "person" vs "company".
  actorNoun?: string;
}

export interface StimulusItem {
  id: string; // stable key recorded in the payload (e.g. "blessed")
  text: string; // the post text
}

/**
 * A single forced-choice item shown after the DV battery (so it does not prime
 * the DVs). Used as a manipulation check; the selected option is recorded.
 */
export interface ManipulationCheckConfig {
  question: string;
  options: string[];
}

export interface StudyConfig {
  study: {
    id: string;
    title: string;
  };
  comprehensionChecks: ComprehensionCheck[];
  memeExamples?: MemeExamples;
  // Optional: a category-rating study (studies 1–4) supplies these; a
  // single-stimulus study (study5) omits them in favour of stimuli/conditions.
  categories?: (string | { label: string; key: string })[];
  dependentVariables: DependentVariable[];
  design: {
    type: string; // "within-subjects" | "between-subjects" | "single-stimulus"
    categoryOrder?: string;
    dvBlocking?: string;
    ratingMode?: string;
    blockIntroTemplate?: string;
    transitionText?: string;
    showUnfamiliarOption?: boolean;
    // single-stimulus only: "first-pinned-rest-randomized" keeps
    // dependentVariables[0] first and shuffles the remainder.
    dvOrderStrategy?: string;
  };
  // single-stimulus only: one post is assigned per participant (the `post` URL
  // param indexes this list; absent/invalid falls back to a random post).
  stimuli?: StimulusItem[];
  conditions?: StimulusCondition[];
  manipulationCheck?: ManipulationCheckConfig;
  instructions?: string;
  freeResponse?: FreeResponseConfig;
  demographics?: DemographicsConfig;
  qualtricsReturnUrl: string;
}

function categoryToKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/** Normalize categories to { label, key } objects. */
export function normalizeCategories(
  raw: (string | { label: string; key: string })[]
): Category[] {
  return raw.map((c) =>
    typeof c === "string" ? { label: c, key: categoryToKey(c) } : c
  );
}

export function loadStudyConfig(): StudyConfig {
  const activeStudy = process.env.ACTIVE_STUDY;
  if (!activeStudy) {
    throw new Error(
      "ACTIVE_STUDY environment variable is not set. " +
        "Set it to a study name (e.g. ACTIVE_STUDY=study1) in .env.local or Vercel project settings."
    );
  }
  const configPath = path.join(process.cwd(), "src", "studies", `${activeStudy}.yaml`);
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Study config not found: src/studies/${activeStudy}.yaml. ` +
        "Check that ACTIVE_STUDY matches a file in src/studies/."
    );
  }
  const fileContents = fs.readFileSync(configPath, "utf8");
  return yaml.load(fileContents) as StudyConfig;
}
