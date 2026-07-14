/**
 * Limpa e corta posts LinkedIn gerados pela LLM (evita loop de hashtags).
 * @param {string} content
 * @param {{ maxChars?: number, maxHashtags?: number }} [options]
 */
export function cleanLinkedInOutput(content, options = {}) {
  const maxChars = options.maxChars || 1800;
  const maxHashtags = options.maxHashtags || 8;

  let cleaned = String(content || "").trim();

  if (!cleaned) {
    return "";
  }

  const fencedMatch = cleaned.match(/^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```$/i);
  if (fencedMatch) {
    cleaned = fencedMatch[1].trim();
  }

  const lines = cleaned.split(/\r?\n/);
  const bodyLines = [];
  const hashtags = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      bodyLines.push("");
      continue;
    }

    const onlyHashtags = trimmed.match(/^(?:#[\p{L}\p{N}_]+\s*)+$/u);
    if (onlyHashtags) {
      const tags = trimmed.match(/#[\p{L}\p{N}_]+/gu) || [];
      for (const tag of tags) {
        if (!hashtags.includes(tag) && hashtags.length < maxHashtags) {
          hashtags.push(tag);
        }
      }
      continue;
    }

    // Hashtags no final da linha do corpo
    const inlineTags = trimmed.match(/#[\p{L}\p{N}_]+/gu) || [];
    let bodyLine = trimmed;
    if (inlineTags.length > 0 && inlineTags.join(" ").length > trimmed.length * 0.5) {
      for (const tag of inlineTags) {
        if (!hashtags.includes(tag) && hashtags.length < maxHashtags) {
          hashtags.push(tag);
        }
      }
      bodyLine = trimmed.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s{2,}/g, " ").trim();
      if (!bodyLine) continue;
    }

    bodyLines.push(bodyLine);
  }

  let body = bodyLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  // Se a LLM repetiu hashtags coladas no final do texto sem quebras
  const runaway = body.search(/(?:\s*#[\p{L}\p{N}_]+){10,}/u);
  if (runaway >= 0) {
    const tail = body.slice(runaway);
    const tags = (tail.match(/#[\p{L}\p{N}_]+/gu) || []).slice(0, maxHashtags);
    for (const tag of tags) {
      if (!hashtags.includes(tag) && hashtags.length < maxHashtags) {
        hashtags.push(tag);
      }
    }
    body = body.slice(0, runaway).trim();
  }

  if (body.length > maxChars) {
    body = `${body.slice(0, maxChars - 1).trim()}…`;
  }

  if (hashtags.length === 0) {
    return body;
  }

  return `${body}\n\n${hashtags.join(" ")}`.trim();
}
