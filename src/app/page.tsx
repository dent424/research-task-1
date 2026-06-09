import { loadStudyConfig } from "@/lib/study-config";
import StudyClient from "./study-client";
import StimulusStudyClient from "./stimulus-study-client";

export default function StudyPage() {
  const config = loadStudyConfig();
  const isSingleStimulus = config.design.type === "single-stimulus";
  return isSingleStimulus ? (
    <StimulusStudyClient config={config} />
  ) : (
    <StudyClient config={config} />
  );
}
