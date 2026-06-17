import { chatCompletion } from "./aiProvider";
import { buildGenerateMessages } from "./promptTemplates";
import type { GenerateTemplate } from "./promptTemplates";

export async function generateContent(template: GenerateTemplate, input: string): Promise<string> {
  if (!input.trim()) {
    throw new Error("Please provide input for generation.");
  }
  const messages = buildGenerateMessages(template, input);
  return chatCompletion(messages, { temperature: 0.7 });
}
