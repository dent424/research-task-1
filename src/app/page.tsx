import { loadStudyConfig } from "@/lib/study-config";
import StudyClient from "./study-client";

export default function StudyPage() {
  const config = loadStudyConfig();
  return <StudyClient config={config} />;
}
