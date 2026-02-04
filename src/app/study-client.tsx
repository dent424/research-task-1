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
import TransitionScreen from "@/components/TransitionScreen";
import type { StudyConfig } from "@/lib/study-config";

type Phase =
  | "loading"
  | "already-completed"
  | "consent"
  | "comprehension-cringe"
  | "comprehension-meme"
  | "meme-examples"
  | "block1"
  | "transition"
  | "block2"
  | "redirect";

function categoryToKey(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

interface StudyClientProps {
  config: StudyConfig;
}

export default function StudyClient({ config }: StudyClientProps) {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  // Randomization state
  const [dvOrder, setDvOrder] = useState<string[]>([]);
  const [block1Categories, setBlock1Categories] = useState<string[]>([]);
  const [block2Categories, setBlock2Categories] = useState<string[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  // Ratings data
  const [ratings, setRatings] = useState<
    Record<string, Record<string, number>>
  >({});

  // Timing data
  const startTimeRef = useRef<number>(0);
  const block1StartRef = useRef<number>(0);
  const block2StartRef = useRef<number>(0);

  // Ref to hold latest study data for the redirect effect
  const studyDataRef = useRef<Record<string, unknown>>({});

  const completedKey = `${config.study.id}_completed`;

  // Scroll to top on phase changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase, currentCategoryIndex]);

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

    // Randomize DV order
    const dvIds = config.dependentVariables.map((dv) => dv.id);
    const shuffledDvs = shuffle(dvIds);
    setDvOrder(shuffledDvs);

    // Randomize category order independently for each block
    setBlock1Categories(shuffle(config.categories));
    setBlock2Categories(shuffle(config.categories));

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
    studyDataRef.current = {
      pid: participantId ?? "",
      cond: condition ?? "",
      dvOrder,
      block1CategoryOrder: block1Categories,
      block2CategoryOrder: block2Categories,
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

  function handleConsent() {
    setPhase("comprehension-cringe");
  }

  function handleDecline() {
    router.push("/no-consent");
  }

  function handleComprehensionCringePass() {
    setPhase("comprehension-meme");
  }

  function handleComprehensionMemePass() {
    setPhase("meme-examples");
  }

  function handleMemeExamplesContinue() {
    setCurrentCategoryIndex(0);
    block1StartRef.current = Date.now();
    setPhase("block1");
  }

  function handleRating(
    blockPhase: "block1" | "block2",
    category: string,
    rating: number
  ) {
    const dvId = dvOrder[blockPhase === "block1" ? 0 : 1];
    const key = categoryToKey(category);

    setRatings((prev) => ({
      ...prev,
      [dvId]: {
        ...prev[dvId],
        [key]: rating,
      },
    }));

    const categories = getCurrentCategories(blockPhase);
    const nextIndex = currentCategoryIndex + 1;

    if (nextIndex < categories.length) {
      setCurrentCategoryIndex(nextIndex);
    } else if (blockPhase === "block1") {
      setPhase("transition");
    } else {
      setPhase("redirect");
    }
  }

  function handleTransitionContinue() {
    setCurrentCategoryIndex(0);
    block2StartRef.current = Date.now();
    setPhase("block2");
  }

  // Handle redirect phase — only depends on `phase`
  useEffect(() => {
    if (phase !== "redirect") return;

    try {
      localStorage.setItem(completedKey, "true");
    } catch {
      // localStorage unavailable — proceed anyway
    }

    redirectWithEncodedData(config.qualtricsReturnUrl, studyDataRef.current);
  }, [phase, completedKey, config.qualtricsReturnUrl]);

  // Find comprehension check configs
  const cringeCheck = config.comprehensionChecks.find(
    (c) => c.id === "cringe"
  );
  const memeCheck = config.comprehensionChecks.find((c) => c.id === "meme");

  // Pre-compute block rendering
  const block1Dv = getCurrentDv("block1");
  const block1Cats = getCurrentCategories("block1");
  const block1Category = block1Cats[currentCategoryIndex];

  const block2Dv = getCurrentDv("block2");
  const block2Cats = getCurrentCategories("block2");
  const block2Category = block2Cats[currentCategoryIndex];

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

        {phase === "comprehension-cringe" && cringeCheck && (
          <ComprehensionCheck
            key="cringe"
            definition={cringeCheck.definition}
            question={cringeCheck.question}
            options={cringeCheck.options}
            retryMessage={cringeCheck.retryMessage}
            onPass={handleComprehensionCringePass}
          />
        )}

        {phase === "comprehension-meme" && memeCheck && (
          <ComprehensionCheck
            key="meme"
            definition={memeCheck.definition}
            question={memeCheck.question}
            options={memeCheck.options}
            retryMessage={memeCheck.retryMessage}
            onPass={handleComprehensionMemePass}
          />
        )}

        {phase === "meme-examples" && (
          <MemeExamples
            introduction={config.memeExamples.introduction}
            images={config.memeExamples.images}
            minViewingSeconds={config.memeExamples.minViewingSeconds}
            onContinue={handleMemeExamplesContinue}
          />
        )}

        {phase === "block1" && block1Dv && block1Category && (
          <CategoryRating
            key={`block1-${currentCategoryIndex}`}
            category={block1Category}
            question={block1Dv.questionTemplate}
            scaleMin={block1Dv.scaleMin}
            scaleMax={block1Dv.scaleMax}
            minLabel={block1Dv.minLabel}
            maxLabel={block1Dv.maxLabel}
            currentIndex={currentCategoryIndex}
            totalCount={block1Cats.length}
            onSubmit={(rating) =>
              handleRating("block1", block1Category, rating)
            }
          />
        )}

        {phase === "transition" && (
          <TransitionScreen
            text={config.design.transitionText}
            onContinue={handleTransitionContinue}
          />
        )}

        {phase === "block2" && block2Dv && block2Category && (
          <CategoryRating
            key={`block2-${currentCategoryIndex}`}
            category={block2Category}
            question={block2Dv.questionTemplate}
            scaleMin={block2Dv.scaleMin}
            scaleMax={block2Dv.scaleMax}
            minLabel={block2Dv.minLabel}
            maxLabel={block2Dv.maxLabel}
            currentIndex={currentCategoryIndex}
            totalCount={block2Cats.length}
            onSubmit={(rating) =>
              handleRating("block2", block2Category, rating)
            }
          />
        )}

        {phase === "redirect" && (
          <p className="text-zinc-500">Submitting your responses...</p>
        )}
      </main>
    </div>
  );
}
