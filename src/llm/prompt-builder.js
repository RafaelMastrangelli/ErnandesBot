function formatContextFiles(contextFiles) {
  if (!contextFiles.length) {
    return "(nenhum arquivo de contexto adicional)";
  }

  return contextFiles
    .map(file => [`--- ${file.relativePath} ---`, file.content.trim()].join("\n"))
    .join("\n\n");
}

function formatRepositoryFiles(files) {
  if (!files.length) {
    return "(nenhum arquivo selecionado)";
  }

  return files
    .map(file => [`=== ${file.relativePath} ===`, file.content.trim()].join("\n"))
    .join("\n\n");
}

export function buildIncrementalDocumentationPrompt(context) {
  return [
    context.instructions,
    "",
    `Arquivo alvo: ${context.targetFile}`,
    "",
    "Documentacao atual:",
    context.existingDocumentation?.trim() || "(vazio)",
    "",
    "Arquivos de contexto (somente leitura):",
    formatContextFiles(context.contextFiles || []),
    "",
    "Diff do commit:",
    context.diff || "(sem diff)",
    "",
    "Metadata:",
    JSON.stringify(context.metadata || {}, null, 2)
  ].join("\n");
}

export function buildBootstrapDocumentationPrompt(context) {
  return [
    context.instructions,
    "",
    `Arquivo alvo: ${context.targetFile}`,
    "",
    "Estrutura do repositorio:",
    (context.repositoryTree || []).join("\n") || "(vazia)",
    "",
    "Arquivos principais:",
    formatRepositoryFiles(context.repositoryFiles || []),
    "",
    "Diff do commit (opcional):",
    context.diff || "(sem diff)",
    "",
    "Metadata:",
    JSON.stringify(context.metadata || {}, null, 2)
  ].join("\n");
}

export function buildLinkedInPrompt(context) {
  return [
    context.instructions,
    "",
    `Arquivo alvo: ${context.targetFile}`,
    "",
    "README do projeto (fonte principal):",
    context.readmeContent?.trim() || "(ainda nao disponivel)",
    "",
    "Diff recente (contexto complementar):",
    context.diff || "(sem diff)",
    "",
    "Metadata:",
    JSON.stringify(context.metadata || {}, null, 2)
  ].join("\n");
}

export function buildDocumentationPrompt(context) {
  if (context.mode === "linkedin") {
    return buildLinkedInPrompt(context);
  }

  if (context.mode === "bootstrap") {
    return buildBootstrapDocumentationPrompt(context);
  }

  return buildIncrementalDocumentationPrompt(context);
}
