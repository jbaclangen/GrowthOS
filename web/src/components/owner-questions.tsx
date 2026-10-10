"use client";

import { useState } from "react";
import { GOAL_OPTIONS, OTHER_GOAL, TOOL_OPTIONS, type OwnerInputs } from "@/lib/owner-inputs";

// The three optional guided questions (BI-12). Field names are read by parseOwnerInputs().
export function OwnerQuestions({ defaults }: { defaults?: OwnerInputs }) {
  const presetGoal = defaults?.goal && (GOAL_OPTIONS as readonly string[]).includes(defaults.goal);
  const [goal, setGoal] = useState<string>(
    !defaults?.goal ? "" : presetGoal ? defaults.goal : OTHER_GOAL,
  );
  const otherTools = (defaults?.tools ?? []).filter((t) => !(TOOL_OPTIONS as readonly string[]).includes(t));

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">
          Main goal for the next few months <span className="font-normal text-muted">(optional)</span>
        </span>
        <select name="goal" value={goal} onChange={(e) => setGoal(e.target.value)} className="input mt-1">
          <option value="">Choose a goal</option>
          {GOAL_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
          <option value={OTHER_GOAL}>Something else</option>
        </select>
      </label>

      {goal === OTHER_GOAL && (
        <label className="block">
          <span className="text-sm font-medium">Describe your goal</span>
          <input
            name="goalOther"
            maxLength={200}
            defaultValue={presetGoal ? "" : (defaults?.goal ?? "")}
            placeholder="For example, hire two more technicians and keep them busy"
            className="input mt-1"
          />
        </label>
      )}

      <label className="block">
        <span className="text-sm font-medium">
          Where you serve customers <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          name="serviceArea"
          maxLength={200}
          defaultValue={defaults?.serviceArea ?? ""}
          placeholder="For example, Dallas–Fort Worth, or nationwide"
          className="input mt-1"
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">
          Tools you already use <span className="font-normal text-muted">(optional)</span>
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {TOOL_OPTIONS.map((t) => (
            <label key={t} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
              <input
                type="checkbox"
                name="tools"
                value={t}
                defaultChecked={defaults?.tools.includes(t)}
                className="h-4 w-4 accent-accent"
              />
              {t}
            </label>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="text-sm font-medium">Other tools</span>
          <input
            name="toolsOther"
            maxLength={200}
            defaultValue={otherTools.join(", ")}
            placeholder="Separate with commas, for example Canva, Jobber"
            className="input mt-1"
          />
        </label>
      </fieldset>
    </div>
  );
}
