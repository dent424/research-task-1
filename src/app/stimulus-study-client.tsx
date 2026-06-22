"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getStudyParams } from "@/lib/params";
import { redirectWithEncodedData } from "@/lib/redirect";
import { shuffle } from "@/lib/shuffle";
import ConsentForm from "@/components/ConsentForm";
import ComprehensionCheck from "@/components/ComprehensionCheck";
import TransitionScreen from "@/components/TransitionScreen";
import Demographics from "@/components/Demographics";
import StimulusRating from "@/components/StimulusRating";
import type { StudyConfig } from "@/lib/study-config";

type Phase =
  | "loading"
  | "already-completed"
  | "consent"
  | "comprehension"
  | "instructions"
  | "rating"
  | "statement-intro"
  | "manipulation-check"
  | "demographics"
  | "redirect"
  | "failed-check";

interface StimulusStudyClientProps {
  config: StudyConfig;
}

interface Assignment {
  condIndex: number;
  conditionKey: string;
  condFromUrl: boolean;
  postIndex: number;
  postId: string;
  postFromUrl: boolean;
  dvOrder: string[]; // realized DV order (pinned DV at index 0 when pinned)
  cringePinned: boolean;
}

/**
 * Build the DV order from the configured dvOrderStrategy:
 *  - "first-pinned-rest-randomized": dependentVariables[0] (e.g. cringe) stays
 *    first; the remainder is shuffled.
 *  - "first-pinned-statements-last": dependentVariables[0] stays first, then the
 *    remaining NON-statement DVs (no `preamble`) shuffled, then the agree/disagree
 *    statement DVs (those with a `preamble`) shuffled. A statement-intro screen is
 *    shown before the statement block (see handleRatingSubmit / statementStartIndex).
 *  - otherwise: all DVs are shuffled.
 */
function buildDvOrder(config: StudyConfig): { dvOrder: string[]; cringePinned: boolean } {
  const dvs = config.dependentVariables;
  const ids = dvs.map((dv) => dv.id);
  const strategy = config.design.dvOrderStrategy;
  if (strategy === "first-pinned-statements-last" && ids.length > 0) {
    const [first, ...rest] = dvs;
    const nonStatements = rest.filter((dv) => !dv.preamble).map((dv) => dv.id);
    const statements = rest.filter((dv) => dv.preamble).map((dv) => dv.id);
    return {
      dvOrder: [first.id, ...shuffle(nonStatements), ...shuffle(statements)],
      cringePinned: true,
    };
  }
  if (strategy === "first-pinned-rest-randomized" && ids.length > 0) {
    const [first, ...rest] = ids;
    return { dvOrder: [first, ...shuffle(rest)], cringePinned: true };
  }
  return { dvOrder: shuffle(ids), cringePinned: false };
}

/**
 * Resolve a between-subjects index from a URL param. The param is honoured ONLY
 * when it is a plain non-negative integer in range; null / "" / non-numeric /
 * out-of-range fall back to a RANDOM index (never silently 0 — Number("") === 0
 * would otherwise land every malformed link on the first cell, biasing the
 * factor). Returns the index and whether it came from a valid URL value.
 */
function resolveIndex(
  raw: string | null,
  count: number
): { index: number; fromUrl: boolean } {
  const n = count > 0 ? count : 1;
  if (raw !== null && /^\d+$/.test(raw)) {
    const idx = Number(raw);
    if (idx >= 0 && idx < n) {
      return { index: idx, fromUrl: true };
    }
  }
  return { index: Math.floor(Math.random() * n), fromUrl: false };
}

export default function StimulusStudyClient({ config }: StimulusStudyClientProps) {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [rawCond, setRawCond] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  const [comprehensionIndex, setComprehensionIndex] = useState(0);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [currentDvIndex, setCurrentDvIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [manipChoice, setManipChoice] = useState<string | null>(null);

  // Demographics (refs mirror study-client.tsx so the redirect payload is fresh)
  const ageRef = useRef("");
  const genderRef = useRef("");
  const manipRef = useRef<string | null>(null);

  const startTimeRef = useRef<number>(0);
  const studyDataRef = useRef<Record<string, unknown>>({});

  const completedKey = `${config.study.id}_completed`;
  const assignmentKey = `${config.study.id}_assignment`;
  const conditions = config.conditions ?? [];
  const stimuli = config.stimuli ?? [];

  // Scroll to top on phase / page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase, currentDvIndex, comprehensionIndex]);

  // --- Init: read params, resolve (or rehydrate) assignment ---
  useEffect(() => {
    try {
      if (localStorage.getItem(completedKey)) {
        setPhase("already-completed");
        return;
      }
    } catch {
      // localStorage unavailable — allow participation
    }

    const { participantId: pid, condition: cond, allParams } = getStudyParams();
    setParticipantId(pid);
    setRawCond(cond);
    const postParam = allParams.get("post");

    // Rehydrate a prior assignment so a mid-study refresh can never move the
    // participant to the other cell or reshuffle the DV order.
    let resolved: Assignment | null = null;
    try {
      const saved = sessionStorage.getItem(assignmentKey);
      if (saved) resolved = JSON.parse(saved) as Assignment;
    } catch {
      // sessionStorage unavailable — fall through to a fresh assignment
    }

    if (!resolved) {
      const actor = resolveIndex(cond, conditions.length);
      const post = resolveIndex(postParam, stimuli.length);
      const { dvOrder, cringePinned } = buildDvOrder(config);
      resolved = {
        condIndex: actor.index,
        conditionKey: conditions[actor.index]?.key ?? "",
        condFromUrl: actor.fromUrl,
        postIndex: post.index,
        postId: stimuli[post.index]?.id ?? "",
        postFromUrl: post.fromUrl,
        dvOrder,
        cringePinned,
      };
      try {
        sessionStorage.setItem(assignmentKey, JSON.stringify(resolved));
      } catch {
        // ignore — assignment simply won't survive a refresh
      }
    }

    setAssignment(resolved);
    setCurrentDvIndex(0);
    setRatings({});

    startTimeRef.current = Date.now();
    setPhase("consent");
  }, [config, completedKey, assignmentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Keep studyDataRef in sync with latest state (no dep array, intentional) ---
  useEffect(() => {
    const endTime = Date.now();
    const data: Record<string, unknown> = {
      pid: participantId ?? "",
      cond: rawCond ?? "", // raw URL value (matches study-client.tsx semantics)
      condIndex: assignment?.condIndex ?? null,
      conditionKey: assignment?.conditionKey ?? "", // primary analysis field
      condFromUrl: assignment?.condFromUrl ?? false,
      postIndex: assignment?.postIndex ?? null,
      postId: assignment?.postId ?? "",
      postFromUrl: assignment?.postFromUrl ?? false,
      dvOrder: assignment?.dvOrder ?? [],
      cringePinned: assignment?.cringePinned ?? false,
      ratings,
      manipulationCheck: manipRef.current,
      timing: {
        totalMs: startTimeRef.current > 0 ? endTime - startTimeRef.current : 0,
      },
      completed: true,
    };
    if (ageRef.current) data.age = ageRef.current;
    if (genderRef.current) data.gender = genderRef.current;
    studyDataRef.current = data;
  });

  // --- Redirect ---
  useEffect(() => {
    if (phase !== "redirect") return;
    try {
      localStorage.setItem(completedKey, "true");
    } catch {
      // proceed anyway
    }
    const extra: Record<string, string> = {};
    if (ageRef.current) extra.age = ageRef.current;
    if (genderRef.current) extra.gender = genderRef.current;
    redirectWithEncodedData(config.qualtricsReturnUrl, studyDataRef.current, extra);
  }, [phase, completedKey, config.qualtricsReturnUrl]);

  // --- Phase transitions ---
  function advanceAfterComprehension() {
    if (config.instructions) {
      setPhase("instructions");
    } else {
      setPhase("rating");
    }
  }

  function handleConsent() {
    if (config.comprehensionChecks.length > 0) {
      setComprehensionIndex(0);
      setPhase("comprehension");
    } else {
      advanceAfterComprehension();
    }
  }

  function handleComprehensionPass() {
    const nextIndex = comprehensionIndex + 1;
    if (nextIndex < config.comprehensionChecks.length) {
      setComprehensionIndex(nextIndex);
    } else {
      advanceAfterComprehension();
    }
  }

  function advanceAfterRating() {
    if (config.manipulationCheck) {
      setPhase("manipulation-check");
    } else if (config.demographics) {
      setPhase("demographics");
    } else {
      setPhase("redirect");
    }
  }

  function handleRatingSubmit(dvId: string, rating: number) {
    setRatings((prev) => ({ ...prev, [dvId]: rating }));
    const order = assignment?.dvOrder ?? [];
    const nextIndex = currentDvIndex + 1;
    if (nextIndex >= order.length) {
      advanceAfterRating();
    } else if (groupStatementsLast && nextIndex === statementStartIndex) {
      // Show the statement-intro screen once, right before the first
      // agree/disagree statement; the index advances on continue.
      setPhase("statement-intro");
    } else {
      setCurrentDvIndex(nextIndex);
    }
  }

  function handleManipulationSubmit() {
    if (manipChoice === null) return;
    manipRef.current = manipChoice;
    if (config.demographics) {
      setPhase("demographics");
    } else {
      setPhase("redirect");
    }
  }

  function handleDemographicsSubmit(data: { age: string; gender: string }) {
    ageRef.current = data.age;
    genderRef.current = data.gender;
    setPhase("redirect");
  }

  // --- Derived render state ---
  const currentCheck = config.comprehensionChecks[comprehensionIndex];
  const condition = assignment ? conditions[assignment.condIndex] : undefined;
  const postText = assignment ? stimuli[assignment.postIndex]?.text : undefined;
  const actorNoun = condition?.actorNoun ?? "account";
  const actorNounPlural = condition?.actorNounPlural ?? "accounts";
  const actorPhrase = condition?.actorPhrase ?? `a ${actorNoun}`;
  const resolveActor = (t: string) =>
    t
      .replace(/\{actorPhrase\}/g, actorPhrase)
      .replace(/\{actors\}/g, actorNounPlural)
      .replace(/\{actor\}/g, actorNoun);
  const scenario = config.scenarioTemplate ? resolveActor(config.scenarioTemplate) : "";
  const dvOrder = assignment?.dvOrder ?? [];
  const currentDvId = dvOrder[currentDvIndex];
  const currentDv = config.dependentVariables.find((dv) => dv.id === currentDvId);
  // When grouping statements last, this is the dvOrder index of the first
  // agree/disagree statement DV (the one-time statement-intro boundary); -1 when
  // the strategy is off or there are no statement DVs.
  const groupStatementsLast =
    config.design.dvOrderStrategy === "first-pinned-statements-last";
  const statementStartIndex = groupStatementsLast
    ? dvOrder.findIndex((id) =>
        Boolean(config.dependentVariables.find((dv) => dv.id === id)?.preamble)
      )
    : -1;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-6 p-8 sm:p-16 text-center">
        {phase === "loading" && <p className="text-zinc-500">Loading...</p>}

        {phase === "already-completed" && (
          <div className="flex flex-col items-center gap-4 max-w-lg">
            <h2 className="text-xl font-semibold">Study Already Completed</h2>
            <p className="text-zinc-600">
              Our records indicate you have already completed this study. Each
              participant may only complete the study once. Thank you for your
              interest.
            </p>
          </div>
        )}

        {phase === "consent" && (
          <ConsentForm
            onAgree={handleConsent}
            onDecline={() => router.push("/no-consent")}
          />
        )}

        {phase === "comprehension" && currentCheck && (
          <ComprehensionCheck
            key={currentCheck.id}
            definition={currentCheck.definition}
            question={currentCheck.question}
            options={currentCheck.options}
            retryMessage={currentCheck.retryMessage}
            maxAttempts={currentCheck.maxAttempts}
            kickWarning={currentCheck.kickWarning}
            onPass={handleComprehensionPass}
            onFail={() => setPhase("failed-check")}
          />
        )}

        {phase === "failed-check" && (
          <div className="flex flex-col items-center gap-4 max-w-lg">
            <h2 className="text-xl font-semibold">Unable to Continue</h2>
            <p className="text-zinc-600">
              Unfortunately, you were unable to correctly answer the
              comprehension check. You will not be able to participate in this
              study.
            </p>
            <p className="text-zinc-600">
              Please return the submission on the platform where you received it
              (e.g., Prolific).
            </p>
          </div>
        )}

        {phase === "instructions" && config.instructions && (
          <TransitionScreen
            text={resolveActor(config.instructions)}
            onContinue={() => setPhase("rating")}
          />
        )}

        {phase === "rating" && postText !== undefined && condition && currentDv && (
          <StimulusRating
            key={currentDvId}
            scenario={currentDv.hideStimulus ? "" : scenario}
            postText={currentDv.hideStimulus ? "" : postText}
            question={resolveActor(currentDv.questionTemplate)}
            preamble={currentDv.preamble}
            scaleMin={currentDv.scaleMin}
            scaleMax={currentDv.scaleMax}
            minLabel={currentDv.minLabel}
            maxLabel={currentDv.maxLabel}
            currentIndex={currentDvIndex}
            totalCount={dvOrder.length}
            onSubmit={(rating) => handleRatingSubmit(currentDvId, rating)}
          />
        )}

        {phase === "statement-intro" && config.design.statementIntroText && (
          <TransitionScreen
            text={resolveActor(config.design.statementIntroText)}
            onContinue={() => {
              setCurrentDvIndex(statementStartIndex);
              setPhase("rating");
            }}
          />
        )}

        {phase === "manipulation-check" && config.manipulationCheck && (
          <div className="flex flex-col items-center gap-8 max-w-2xl">
            <h3 className="text-lg font-medium text-center">
              {config.manipulationCheck.question}
            </h3>
            <div className="flex flex-col gap-3 w-full max-w-md text-left">
              {config.manipulationCheck.options.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 cursor-pointer rounded-lg border-2 border-zinc-200 px-4 py-3 hover:border-zinc-400"
                >
                  <input
                    type="radio"
                    name="manipulation-check"
                    value={option}
                    checked={manipChoice === option}
                    onChange={() => setManipChoice(option)}
                    className="h-4 w-4 accent-zinc-800"
                  />
                  <span className="text-zinc-700">{option}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleManipulationSubmit}
              disabled={manipChoice === null}
              className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {phase === "demographics" && config.demographics && (
          <Demographics
            ageConfig={config.demographics.age}
            genderConfig={config.demographics.gender}
            onSubmit={handleDemographicsSubmit}
          />
        )}

        {phase === "redirect" && (
          <p className="text-zinc-500">Submitting your responses...</p>
        )}
      </main>
    </div>
  );
}
