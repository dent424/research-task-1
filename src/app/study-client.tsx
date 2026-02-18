"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getStudyParams } from "@/lib/params";
import { redirectWithEncodedData } from "@/lib/redirect";
import { shuffle } from "@/lib/shuffle";
import ConsentForm from "@/components/ConsentForm";
import ComprehensionCheck from "@/components/ComprehensionCheck";
import MemeExamples from "@/components/MemeExamples";
import CategoryRating from "@/components/CategoryRating";
import BatchCategoryRating from "@/components/BatchCategoryRating";
import TransitionScreen from "@/components/TransitionScreen";
import FreeResponse from "@/components/FreeResponse";
import Demographics from "@/components/Demographics";
import type { StudyConfig, Category } from "@/lib/study-config";
import { normalizeCategories } from "@/lib/study-config";

type Phase =
  | "loading"
  | "already-completed"
  | "consent"
  | "comprehension"
  | "meme-examples"
  | "instructions"
  | "block1-intro"
  | "block1"
  | "transition"
  | "block2"
  | "free-response"
  | "demographics"
  | "redirect"
  | "failed-check";

interface StudyClientProps {
  config: StudyConfig;
}

export default function StudyClient({ config }: StudyClientProps) {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  // Comprehension check progress
  const [comprehensionIndex, setComprehensionIndex] = useState(0);

  // Randomization state
  const [dvOrder, setDvOrder] = useState<string[]>([]);
  const [block1Categories, setBlock1Categories] = useState<Category[]>([]);
  const [block2Categories, setBlock2Categories] = useState<Category[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  // Ratings data
  const [ratings, setRatings] = useState<
    Record<string, Record<string, number>>
  >({});

  // Free-response and demographics data
  const [freeResponse, setFreeResponse] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const freeResponseRef = useRef("");
  const ageRef = useRef("");
  const genderRef = useRef("");

  // Timing data
  const startTimeRef = useRef<number>(0);
  const block1StartRef = useRef<number>(0);
  const block2StartRef = useRef<number>(0);

  // Ref to hold latest study data for the redirect effect
  const studyDataRef = useRef<Record<string, unknown>>({});

  const completedKey = `${config.study.id}_completed`;
  const ratingMode = config.design.ratingMode ?? "individual";

  // Scroll to top on phase changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase, currentCategoryIndex, comprehensionIndex]);

  useEffect(() => {
    // Check if participant already completed this study
    try {
      if (localStorage.getItem(completedKey)) {
        setPhase("already-completed");
        return;
      }
    } catch {
      // localStorage unavailable (e.g. private browsing) — allow participation
    }

    const { participantId: pid, condition: cond } = getStudyParams();
    setParticipantId(pid);
    setCondition(cond);

    // Select DVs based on design type
    let dvIds: string[];
    if (config.design.type === "between-subjects" && cond) {
      const indices = cond.split(",").map(Number);
      dvIds = indices.map((i) => config.dependentVariables[i].id);
    } else {
      dvIds = config.dependentVariables.map((dv) => dv.id);
    }

    // Randomize DV order
    const shuffledDvs = shuffle(dvIds);
    setDvOrder(shuffledDvs);

    // Normalize and randomize category order independently for each block
    const cats = normalizeCategories(config.categories);
    setBlock1Categories(shuffle(cats));
    setBlock2Categories(shuffle(cats));

    // Initialize ratings structure
    const initialRatings: Record<string, Record<string, number>> = {};
    for (const dv of dvIds) {
      initialRatings[dv] = {};
    }
    setRatings(initialRatings);

    startTimeRef.current = Date.now();
    setPhase("consent");
  }, [config, completedKey]);

  // Keep studyDataRef in sync with latest state
  useEffect(() => {
    const endTime = Date.now();
    const data: Record<string, unknown> = {
      pid: participantId ?? "",
      cond: condition ?? "",
      dvOrder,
      block1CategoryOrder: block1Categories.map((c) => c.key),
      block2CategoryOrder: block2Categories.map((c) => c.key),
      ratings,
      timing: {
        totalMs: startTimeRef.current > 0 ? endTime - startTimeRef.current : 0,
        block1Ms: block1StartRef.current > 0
          ? (block2StartRef.current > 0
              ? block2StartRef.current - block1StartRef.current
              : endTime - block1StartRef.current)
          : 0,
        block2Ms: block2StartRef.current > 0
          ? endTime - block2StartRef.current
          : 0,
      },
      completed: true,
    };
    if (ageRef.current) data.age = ageRef.current;
    if (genderRef.current) data.gender = genderRef.current;
    studyDataRef.current = data;
  });

  const getCurrentDv = useCallback(
    (blockPhase: "block1" | "block2") => {
      const dvIndex = blockPhase === "block1" ? 0 : 1;
      const dvId = dvOrder[dvIndex];
      return config.dependentVariables.find((dv) => dv.id === dvId);
    },
    [dvOrder, config.dependentVariables]
  );

  const getCurrentCategories = useCallback(
    (blockPhase: "block1" | "block2") => {
      return blockPhase === "block1" ? block1Categories : block2Categories;
    },
    [block1Categories, block2Categories]
  );

  // Substitute {trait} placeholder with the trait label for a given block
  function substituteTraitLabel(text: string, blockPhase: "block1" | "block2"): string {
    const dv = getCurrentDv(blockPhase);
    const traitLabel = dv?.label ?? dv?.id ?? "";
    return text.replace(/\{trait\}/g, traitLabel);
  }

  function getBlockIntroText(blockPhase: "block1" | "block2"): string {
    const template = config.design.blockIntroTemplate;
    if (!template) return "";
    return substituteTraitLabel(template, blockPhase);
  }

  // --- Phase transition handlers ---

  function handleConsent() {
    if (config.comprehensionChecks.length > 0) {
      setComprehensionIndex(0);
      setPhase("comprehension");
    } else {
      advanceAfterComprehension();
    }
  }

  function handleDecline() {
    router.push("/no-consent");
  }

  function handleComprehensionPass() {
    const nextIndex = comprehensionIndex + 1;
    if (nextIndex < config.comprehensionChecks.length) {
      setComprehensionIndex(nextIndex);
    } else {
      advanceAfterComprehension();
    }
  }

  function handleComprehensionFail() {
    setPhase("failed-check");
  }

  function advanceAfterComprehension() {
    if (config.memeExamples) {
      setPhase("meme-examples");
    } else if (config.instructions) {
      setPhase("instructions");
    } else {
      advanceToBlock1();
    }
  }

  function handleMemeExamplesContinue() {
    if (config.instructions) {
      setPhase("instructions");
    } else {
      advanceToBlock1();
    }
  }

  function handleInstructionsContinue() {
    advanceToBlock1();
  }

  function advanceToBlock1() {
    if (config.design.blockIntroTemplate) {
      setPhase("block1-intro");
    } else {
      startBlock1();
    }
  }

  function startBlock1() {
    setCurrentCategoryIndex(0);
    block1StartRef.current = Date.now();
    setPhase("block1");
  }

  function advanceAfterBlock2() {
    if (config.freeResponse) {
      setPhase("free-response");
    } else if (config.demographics) {
      setPhase("demographics");
    } else {
      setPhase("redirect");
    }
  }

  // Individual rating handler (one category at a time)
  function handleRating(
    blockPhase: "block1" | "block2",
    categoryKey: string,
    rating: number
  ) {
    const dvId = dvOrder[blockPhase === "block1" ? 0 : 1];

    setRatings((prev) => ({
      ...prev,
      [dvId]: {
        ...prev[dvId],
        [categoryKey]: rating,
      },
    }));

    const categories = getCurrentCategories(blockPhase);
    const nextIndex = currentCategoryIndex + 1;

    if (nextIndex < categories.length) {
      setCurrentCategoryIndex(nextIndex);
    } else if (blockPhase === "block1") {
      setPhase("transition");
    } else {
      advanceAfterBlock2();
    }
  }

  // Batch rating handler (all categories at once)
  function handleBatchRating(
    blockPhase: "block1" | "block2",
    allRatings: Record<string, number>
  ) {
    const dvId = dvOrder[blockPhase === "block1" ? 0 : 1];
    setRatings((prev) => ({
      ...prev,
      [dvId]: allRatings,
    }));

    if (blockPhase === "block1") {
      setPhase("transition");
    } else {
      advanceAfterBlock2();
    }
  }

  function handleTransitionContinue() {
    setCurrentCategoryIndex(0);
    block2StartRef.current = Date.now();
    setPhase("block2");
  }

  function handleFreeResponseSubmit(text: string) {
    setFreeResponse(text);
    freeResponseRef.current = text;
    if (config.demographics) {
      setPhase("demographics");
    } else {
      setPhase("redirect");
    }
  }

  function handleDemographicsSubmit(data: { age: string; gender: string }) {
    setAge(data.age);
    setGender(data.gender);
    ageRef.current = data.age;
    genderRef.current = data.gender;
    setPhase("redirect");
  }

  // Handle redirect phase — only depends on `phase`
  useEffect(() => {
    if (phase !== "redirect") return;

    try {
      localStorage.setItem(completedKey, "true");
    } catch {
      // localStorage unavailable — proceed anyway
    }

    const extra: Record<string, string> = {};
    if (freeResponseRef.current) extra.free_response = freeResponseRef.current;
    if (ageRef.current) extra.age = ageRef.current;
    if (genderRef.current) extra.gender = genderRef.current;

    redirectWithEncodedData(config.qualtricsReturnUrl, studyDataRef.current, extra);
  }, [phase, completedKey, config.qualtricsReturnUrl]);

  // Current comprehension check
  const currentCheck = config.comprehensionChecks[comprehensionIndex];

  // Pre-compute block rendering
  const block1Dv = getCurrentDv("block1");
  const block1Cats = getCurrentCategories("block1");
  const block1Cat = block1Cats[currentCategoryIndex];

  const block2Dv = getCurrentDv("block2");
  const block2Cats = getCurrentCategories("block2");
  const block2Cat = block2Cats[currentCategoryIndex];

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-6 p-8 sm:p-16 text-center">
        {phase === "loading" && (
          <p className="text-zinc-500">Loading...</p>
        )}

        {phase === "already-completed" && (
          <div className="flex flex-col items-center gap-4 max-w-lg">
            <h2 className="text-xl font-semibold">Study Already Completed</h2>
            <p className="text-zinc-600">
              Our records indicate you have already completed this study.
              Each participant may only complete the study once. Thank you
              for your interest.
            </p>
          </div>
        )}

        {phase === "consent" && (
          <ConsentForm onAgree={handleConsent} onDecline={handleDecline} />
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
            onFail={handleComprehensionFail}
          />
        )}

        {phase === "failed-check" && (
          <div className="flex flex-col items-center gap-4 max-w-lg">
            <h2 className="text-xl font-semibold">Unable to Continue</h2>
            <p className="text-zinc-600">
              Unfortunately, you were unable to correctly answer the
              comprehension check. You will not be able to participate in
              this study.
            </p>
            <p className="text-zinc-600">
              Please return the submission on the platform where you received
              it (e.g., Prolific).
            </p>
          </div>
        )}

        {phase === "meme-examples" && config.memeExamples && (
          <MemeExamples
            introduction={config.memeExamples.introduction}
            images={config.memeExamples.images}
            minViewingSeconds={config.memeExamples.minViewingSeconds}
            onContinue={handleMemeExamplesContinue}
          />
        )}

        {phase === "instructions" && config.instructions && (
          <TransitionScreen
            text={config.instructions}
            onContinue={handleInstructionsContinue}
          />
        )}

        {phase === "block1-intro" && (
          <TransitionScreen
            text={getBlockIntroText("block1")}
            onContinue={startBlock1}
          />
        )}

        {phase === "block1" && block1Dv && ratingMode === "batch" && (
          <BatchCategoryRating
            key="block1-batch"
            categories={block1Cats}
            question={block1Dv.questionTemplate}
            scaleMin={block1Dv.scaleMin}
            scaleMax={block1Dv.scaleMax}
            minLabel={block1Dv.minLabel}
            maxLabel={block1Dv.maxLabel}
            onSubmit={(allRatings) => handleBatchRating("block1", allRatings)}
          />
        )}

        {phase === "block1" && block1Dv && block1Cat && ratingMode !== "batch" && (
          <CategoryRating
            key={`block1-${currentCategoryIndex}`}
            category={block1Cat.label}
            question={block1Dv.questionTemplate}
            scaleMin={block1Dv.scaleMin}
            scaleMax={block1Dv.scaleMax}
            minLabel={block1Dv.minLabel}
            maxLabel={block1Dv.maxLabel}
            currentIndex={currentCategoryIndex}
            totalCount={block1Cats.length}
            onSubmit={(rating) =>
              handleRating("block1", block1Cat.key, rating)
            }
          />
        )}

        {phase === "transition" && (
          <TransitionScreen
            text={substituteTraitLabel(config.design.transitionText, "block2")}
            onContinue={handleTransitionContinue}
          />
        )}

        {phase === "block2" && block2Dv && ratingMode === "batch" && (
          <BatchCategoryRating
            key="block2-batch"
            categories={block2Cats}
            question={block2Dv.questionTemplate}
            scaleMin={block2Dv.scaleMin}
            scaleMax={block2Dv.scaleMax}
            minLabel={block2Dv.minLabel}
            maxLabel={block2Dv.maxLabel}
            onSubmit={(allRatings) => handleBatchRating("block2", allRatings)}
          />
        )}

        {phase === "block2" && block2Dv && block2Cat && ratingMode !== "batch" && (
          <CategoryRating
            key={`block2-${currentCategoryIndex}`}
            category={block2Cat.label}
            question={block2Dv.questionTemplate}
            scaleMin={block2Dv.scaleMin}
            scaleMax={block2Dv.scaleMax}
            minLabel={block2Dv.minLabel}
            maxLabel={block2Dv.maxLabel}
            currentIndex={currentCategoryIndex}
            totalCount={block2Cats.length}
            onSubmit={(rating) =>
              handleRating("block2", block2Cat.key, rating)
            }
          />
        )}

        {phase === "free-response" && config.freeResponse && (
          <FreeResponse
            question={config.freeResponse.question}
            aiWarning={config.freeResponse.aiWarning}
            minChars={config.freeResponse.minChars}
            maxChars={config.freeResponse.maxChars}
            minSeconds={config.freeResponse.minSeconds}
            placeholder={config.freeResponse.placeholder}
            onSubmit={handleFreeResponseSubmit}
          />
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
