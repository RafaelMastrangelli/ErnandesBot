function formatContextFiles(contextFiles) {
  if (!contextFiles.length) {
    return "(nenhum arquivo de contexto adicional)";
  }

  return contextFiles
    .map(file => {
      return [`--- ${file.relativePath} ---`, file.content.trim()].join("\n");
    })
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
    "Estrutura do repositorio (arquivos descobertos):",
    (context.repositoryTree || []).join("\n") || "(vazia)",
    "",
    "Arquivos principais (conteudo):",
    formatRepositoryFiles(context.repositoryFiles || []),
    "",
    "Diff do commit que disparou o bootstrap (opcional):",
    context.diff || "(sem diff)",
    "",
    "Metadata:",
    JSON.stringify(context.metadata || {}, null, 2)
  ].join("\n");
}

/**
 * Compatibilidade com providers — escolhe o prompt conforme o modo.
 */
export function buildDocumentationPrompt(context) {
  if (context.mode === "bootstrap") {
    return buildBootstrapDocumentationPrompt(context);
  }

  return buildIncrementalDocumentationPrompt(context);
}
