import { TriageFeedback } from "../models/TriageFeedback.js";
import type { TriageFeedbackInput, TriageLevel } from "@aegis/shared";

const MAX_EXAMPLES = 8;

export async function recordTriageFeedback(
  input: TriageFeedbackInput,
  userId?: string
): Promise<void> {
  await TriageFeedback.create({
    ...input,
    createdBy: userId,
  });
}

/** Pull recent clinician corrections to improve Claude prompts (in-context learning). */
export async function getLearningExamples(categoryHint?: string): Promise<string> {
  const filter = categoryHint
    ? { $or: [{ originalCategory: categoryHint }, { correctedCategory: categoryHint }] }
    : {};

  const examples = await TriageFeedback.find(filter)
    .sort({ createdAt: -1 })
    .limit(MAX_EXAMPLES)
    .lean();

  if (!examples.length) return "";

  const lines = examples.map((ex, i) => {
    const notes = ex.clinicianNotes ? ` Notes: "${ex.clinicianNotes}"` : "";
    return `${i + 1}. Input category "${ex.originalCategory ?? "unknown"}" at ${ex.originalPriority} → clinician corrected to ${ex.correctedPriority}${ex.correctedCategory ? ` (${ex.correctedCategory})` : ""}.${notes}`;
  });

  return `\n\nRecent clinician corrections from this ED (learn from these patterns):\n${lines.join("\n")}`;
}

export async function getFeedbackStats(): Promise<{ total: number; byPriority: Record<string, number> }> {
  const total = await TriageFeedback.countDocuments();
  const agg = await TriageFeedback.aggregate([
    { $group: { _id: "$correctedPriority", count: { $sum: 1 } } },
  ]);
  const byPriority: Record<string, number> = {};
  for (const row of agg) byPriority[row._id as TriageLevel] = row.count;
  return { total, byPriority };
}
