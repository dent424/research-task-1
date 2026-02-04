"use client";

import { useState } from "react";

interface DemographicsProps {
  ageConfig: { label: string; placeholder: string };
  genderConfig: { label: string; options: string[] };
  onSubmit: (data: { age: string; gender: string }) => void;
}

export default function Demographics({
  ageConfig,
  genderConfig,
  onSubmit,
}: DemographicsProps) {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  const canSubmit = age.trim() !== "" && gender !== "";

  return (
    <div className="flex flex-col gap-8 max-w-2xl text-left">
      <div className="flex flex-col gap-3">
        <label className="text-lg font-medium">{ageConfig.label}</label>
        <input
          type="number"
          min={18}
          max={120}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder={ageConfig.placeholder}
          className="w-32 rounded-lg border border-zinc-300 p-3 text-zinc-700 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-lg font-medium">{genderConfig.label}</label>
        <div className="flex flex-col gap-2">
          {genderConfig.options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="radio"
                name="gender"
                value={option}
                checked={gender === option}
                onChange={() => setGender(option)}
                className="h-4 w-4 accent-zinc-800"
              />
              <span className="text-zinc-700">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          if (canSubmit) onSubmit({ age, gender });
        }}
        disabled={!canSubmit}
        className="self-center rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
