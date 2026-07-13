function formatContextFiles(contextFiles) {
  if (!contextFiles.length) {
    return "(nenhum arquivo de contexto adicional)";
  }

  return contextFiles
    .map(file => {
      return [
        `--- ${file.relativePath} ---`,
        file.content.trim()
      ].join("\n");
    })
    .join("\n\n");
}

export function buildDocumentationPrompt(context) {
  const existingDocumentation = context.existingDocumentation?.trim()
    ? context.existingDocumentation
    : "(arquivo ainda nao existe — crie a documentacao inicial com base no diff)";

  return [
    context.instructions,
    "",
    `Arquivo alvo: ${context.targetFile}`,
    "",
    "Documentacao atual:",
    existingDocumentation,
    "",
    "Arquivos de contexto (somente leitura):",
    formatContextFiles(context.contextFiles || []),
    "",
    "Diff do commit:",
    context.diff,
    "",
    "Metadata:",
    JSON.stringify(context.metadata || {}, null, 2)
  ].join("\n");
}
