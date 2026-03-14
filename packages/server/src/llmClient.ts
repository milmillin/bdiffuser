const API_URL = "https://api.z.ai/api/coding/paas/v4/chat/completions";
const MODEL = "glm-5";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  tokPerSec: number;
}

export interface LLMResult {
  parsed: Record<string, unknown>;
  usage: LLMUsageStats | null;
}

export async function callLLM(
  apiKey: string,
  messages: ChatMessage[],
): Promise<LLMResult> {
  const startMs = Date.now();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    choices: {
      message: { content: string; reasoning_content?: string };
    }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      completion_tokens_details?: {
        reasoning_tokens?: number;
      };
    };
  };

  const durationMs = Date.now() - startMs;

  const message = data.choices?.[0]?.message;
  const content = message?.content;
  if (!content) {
    throw new Error("LLM returned empty content");
  }

  const parsed = JSON.parse(content) as Record<string, unknown>;

  // NOTE: ZhipuAI thinking models (glm-5 etc.) return chain-of-thought in
  // `reasoning_content`, but we intentionally do NOT inject it into the result.
  // The CoT contains analysis of the bot's own hand which would leak hidden
  // information if broadcast as chat. Instead, the model provides a separate
  // `communication` field that follows the game's communication rules.

  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  const totalTokens = data.usage?.total_tokens ?? 0;
  const reasoningTokens = data.usage?.completion_tokens_details?.reasoning_tokens;

  console.log("LLM usage raw:", JSON.stringify(data.usage ?? null));
  if (reasoningTokens != null) {
    console.log(`LLM reasoning tokens: ${reasoningTokens} (of ${completionTokens} completion)`);
  }

  const usage: LLMUsageStats | null = totalTokens > 0
    ? {
        promptTokens,
        completionTokens,
        totalTokens,
        durationMs,
        tokPerSec: Math.round(totalTokens / (durationMs / 1000)),
      }
    : durationMs > 0
      ? { promptTokens: 0, completionTokens: 0, totalTokens: 0, durationMs, tokPerSec: 0 }
      : null;

  return { parsed, usage };
}
