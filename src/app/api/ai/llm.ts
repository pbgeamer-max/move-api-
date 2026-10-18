// TVORA AI — shared LLM plumbing for /api/ai/* routes (server-only, task 6-a).
// z-ai-web-dev-sdk is imported ONLY here, inside src/app/api/** — never on the client.
import ZAI from "z-ai-web-dev-sdk";

export type LlmJson = Record<string, unknown>;

/**
 * One-shot chat completion that must answer with a strict JSON object.
 * Returns null on ANY failure (network, SDK, unparseable output) so routes can
 * degrade gracefully to algorithmic behavior.
 */
export async function chatJson(system: string, user: string): Promise<LlmJson | null> {
  try {
    const zai = await ZAI.create();
    const res = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: user },
      ],
      stream: false,
      thinking: { type: "disabled" },
    });
    const raw = res.choices?.[0]?.message?.content ?? "";
    return extractJson(typeof raw === "string" ? raw : "");
  } catch {
    return null;
  }
}

/** Defensive JSON extraction: strips code fences / prose, parses the outermost object. */
export function extractJson(text: string): LlmJson | null {
  if (!text) return null;
  let s = text.trim();
  s = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(s.slice(start, end + 1));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as LlmJson;
    }
    return null;
  } catch {
    return null;
  }
}

export function asStringArray(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function asString(value: unknown, max = 600): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s.slice(0, max) : null;
}
