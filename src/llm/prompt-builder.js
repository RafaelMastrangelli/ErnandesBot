export function buildDocumentationPrompt(context) {
  return [
    context.instructions,
    "",
    "Diff do commit:",
    context.diff,
    "",
    "Metadata:",
    JSON.stringify(context.metadata || {}, null, 2)
  ].join("\n");
}
