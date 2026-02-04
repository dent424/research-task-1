export default function NoConsent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-6 p-16 text-center max-w-lg">
        <h1 className="text-2xl font-semibold">Thank You</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          You have chosen not to participate in this study. No data has been
          collected.
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          Please return the survey on the platform where you received it (e.g.,
          Prolific, MTurk, or Qualtrics).
        </p>
      </main>
    </div>
  );
}
