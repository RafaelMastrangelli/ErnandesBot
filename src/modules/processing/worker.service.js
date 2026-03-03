import { env } from "../../config/env.js";
import { createLLMProvider } from "../../llm/index.js";
import { cloneRepository } from "../repositoryManager.js";
import { getCommitDiff } from "../diffAnalyzer.js";

function buildDocumentationContext(event, diff) {
  return {
    systemPrompt:
      "Voce e um agente tecnico de documentacao. Gere atualizacoes claras, objetivas e consistentes com o repositorio.",
    instructions: [
      "Analise o diff recebido e produza uma proposta de documentacao tecnica.",
      "Considere mudancas funcionais, impactos e pontos de atencao.",
      "Responda em portugues e use formato enxuto."
    ].join(" "),
    diff,
    metadata: {
      workspace: event.workspace,
      repo: event.repo,
      branch: event.branch,
      oldHash: event.oldHash,
      newHash: event.newHash
    }
  };
}

async function processEvent(event, logger, llmProvider) {
  const repoPath = await cloneRepository({
    workspace: event.workspace,
    repo: event.repo,
    branch: event.branch,
    workspaceDir: env.workspaceDir,
    logger
  });

  const oldHash = event.oldHash || `${event.newHash}^`;
  const diff = await getCommitDiff({
    repoPath,
    oldHash,
    newHash: event.newHash,
    ignoredPaths: env.ignoredDiffPaths,
    maxDiffSize: env.maxDiffSize,
    logger
  });

  if (!diff || diff.trim().length === 0) {
    logger.info("Nenhuma alteracao relevante encontrada", {
      repo: event.repo,
      branch: event.branch
    });
    return;
  }

  logger.info("Diff gerado com sucesso", {
    repo: event.repo,
    branch: event.branch,
    preview: diff.substring(0, 800)
  });

  const context = buildDocumentationContext(event, diff);
  const generatedDocumentation = await llmProvider.generateDocumentation(context);

  logger.info("Resposta da LLM recebida", {
    repo: event.repo,
    branch: event.branch,
    preview: generatedDocumentation.substring(0, 800)
  });

  // Ponto futuro: persistir/atualizar arquivos e efetuar commit/push.
}

export function startWorker({ queue, logger }) {
  let isProcessing = false;
  const llmProvider = createLLMProvider();

  setInterval(async () => {
    if (isProcessing) return;

    const event = queue.dequeue();
    if (!event) return;

    isProcessing = true;

    logger.info("Worker processando evento", {
      repo: event.repo,
      branch: event.branch,
      attempts: event.attempts || 0
    });

    try {
      await processEvent(event, logger, llmProvider);
    } catch (error) {
      const attempts = (event.attempts || 0) + 1;
      const canRetry = attempts <= env.maxProcessingRetries;

      logger.error("Erro no processamento do evento", {
        message: error?.message || "Erro desconhecido",
        repo: event.repo,
        branch: event.branch,
        attempts
      });

      if (canRetry) {
        const requeued = queue.enqueue({
          ...event,
          attempts
        });

        if (!requeued) {
          logger.error("Falha ao reenfileirar evento apos erro: fila cheia", {
            repo: event.repo,
            branch: event.branch
          });
        } else {
          logger.warn("Evento reenfileirado para nova tentativa", {
            repo: event.repo,
            branch: event.branch,
            attempts
          });
        }
      }
    } finally {
      isProcessing = false;
    }
  }, env.workerPollMs);
}
