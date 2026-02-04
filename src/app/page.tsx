"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStudyParams } from "@/lib/params";
import { redirectToQualtrics } from "@/lib/redirect";
import ConsentForm from "@/components/ConsentForm";

// ── Configure per study ───────────────────────────────────────────────
// Replace with the actual Qualtrics survey URL for this study's post-survey.
const QUALTRICS_RETURN_URL =
  "https://YOURUNIVERSITY.qualtrics.com/jfe/form/SV_REPLACE_ME";
// ──────────────────────────────────────────────────────────────────────

type Phase = "consent" | "study" | "complete";

export default function Study() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("consent");

  useEffect(() => {
    const { participantId: pid, condition: cond } = getStudyParams();
    setParticipantId(pid);
    setCondition(cond);
  }, []);

  function handleConsent() {
    setPhase("study");
  }

  function handleDecline() {
    router.push("/no-consent");
  }

  function handleComplete() {
    // Pass any collected data back to Qualtrics here.
    // Add or change keys to match your Qualtrics embedded data fields.
    redirectToQualtrics(QUALTRICS_RETURN_URL, {
      pid: participantId ?? "",
      cond: condition ?? "",
      completed: 1,
      // Add study-specific data here, e.g.:
      // taskScore: 85,
      // reactionTime: 350,
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-6 p-16 text-center">
        <h1 className="text-2xl font-semibold">Study 1</h1>

        {/* Debug: show incoming params (remove before launch) */}
        <div className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          <p>Participant ID: {participantId ?? "—"}</p>
          <p>Condition: {condition ?? "—"}</p>
        </div>

        {phase === "consent" && (
          <ConsentForm onAgree={handleConsent} onDecline={handleDecline} />
        )}

        {phase === "study" && (
          <div className="flex flex-col items-center gap-6">
            {/* ── Study content goes here ── */}
            <p className="text-zinc-500">
              [Study task placeholder — replace with actual study content]
            </p>
            {/* ──────────────────────────── */}

            <button
              onClick={handleComplete}
              className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300"
            >
              Complete Study
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
