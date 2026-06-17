import OpenAI from "openai";

const PROVIDER_CONFIGS: Record<string, { baseUrl: string }> = {
  groq: { baseUrl: "https://api.groq.com/openai/v1" },
  openai: { baseUrl: "https://api.openai.com/v1" },
};

function getClient(): OpenAI {
  let apiKey = "";
  let baseUrl = "";
  try {
    const raw = localStorage.getItem("minus_ai_settings");
    if (raw) {
      const settings = JSON.parse(raw);
      apiKey = settings.apiKey || "";
      const provider = settings.provider || "groq";
      const conf = PROVIDER_CONFIGS[provider];
      baseUrl = settings.baseUrl || conf?.baseUrl || PROVIDER_CONFIGS.groq.baseUrl;
    }
  } catch {
    // ignore
  }

  if (!apiKey) {
    apiKey = import.meta.env.VITE_GROQ_AI_API_KEY || "";
  }
  if (!apiKey) {
    throw new Error("API key is not set. Please configure it in Settings.");
  }
  if (!baseUrl) {
    baseUrl = PROVIDER_CONFIGS.groq.baseUrl;
  }
  return new OpenAI({
    apiKey,
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true,
  });
}

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiCompletionOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

function getDefaultModel(): string {
  try {
    const raw = localStorage.getItem("minus_ai_settings");
    if (raw) {
      const settings = JSON.parse(raw);
      return settings.defaultModel || "llama-3.3-70b-versatile";
    }
  } catch {
    // ignore
  }
  return "llama-3.3-70b-versatile";
}

export async function chatCompletion(messages: AiMessage[], options: AiCompletionOptions = {}): Promise<string> {
  const model = options.model || getDefaultModel();
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 4096;
  const response = await getClient().chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content || "";
}

export async function* chatCompletionStream(
  messages: AiMessage[],
  options: AiCompletionOptions = {},
): AsyncGenerator<string> {
  const model = options.model || getDefaultModel();
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 4096;
  const stream = await getClient().chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      yield content;
    }
  }
}
