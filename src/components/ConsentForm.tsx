"use client";

interface ConsentFormProps {
  onAgree: () => void;
  onDecline: () => void;
}

export default function ConsentForm({ onAgree, onDecline }: ConsentFormProps) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl text-left">
      <h2 className="text-2xl font-semibold text-center">Informed Consent</h2>

      <p>
        This survey is being conducted for the purposes of consumer behavior
        research. Any questions, concerns, or inquiries should be directed to
        the primary investigator Alexander Moore, University of Illinois
        Chicago, akmoore@uic.edu, 312-536-6470.
      </p>

      <p>
        The purpose of this research is to help academics and practitioners
        better understand how people think about various product categories and
        how people choose products based on what they think.
      </p>

      <p>
        To begin this survey, you will be given an attention-check question.
        This question tells you how to respond to make sure you are paying
        attention. If you answer the question incorrectly, you will not be
        allowed to participate. If you pass the attention-check question, you
        will be given some contextual information and then you will be asked
        some questions about how you think of some of that information. Finally,
        you will be asked to provide basic demographic information.
      </p>

      <p>
        To protect your privacy and confidentiality (1) you may refuse to
        complete this survey without consequence, (2) you may choose to have
        your data excluded from analysis at the end of the survey, and (3) we
        will not collect any information that could be used to identify you or
        associate you with your responses. Confidentiality will be maintained to
        the degree permitted by the technology used. Your participation in this
        online survey involves risks similar to a person&apos;s everyday use of
        the Internet.
      </p>

      <p>
        If you agree to participate in this research, please choose
        &ldquo;I agree&rdquo; below. If not, please choose
        &ldquo;I do NOT agree&rdquo; below, upon which you will exit the survey.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <button
          onClick={onAgree}
          className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700"
        >
          I agree
        </button>
        <button
          onClick={onDecline}
          className="rounded-full border border-zinc-300 px-6 py-3 transition-colors hover:bg-zinc-100"
        >
          I do NOT agree
        </button>
      </div>
    </div>
  );
}
