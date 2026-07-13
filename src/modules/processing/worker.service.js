import { env } from "../../config/env.js";
import { createLLMProvider } from "../../llm/index.js";
import { cloneRepository } from "../repositoryManager.js";
import { getCommitDiff } from "../diffAnalyzer.js";
import { readExistingDocumentation } from "../documentation/documentation.service.js";
import { commitAndPushDocumentation } from "../documentation/documentationCommitter.js";

function buildDocumentationContext(event, diff, documentation) {
  return {
    systemPrompt:
      "Voce e um agente tecnico de documentacao. Atualize documentacao existente de forma clara, objetiva e consistente com o repositorio.",
    instructions: [
      "Voce recebera a documentacao atual do projeto, arquivos de contexto e o diff do ultimo push.",
      "Atualize a documentacao mantendo informacoes validas e incorporando as mudancas do diff.",
      "Remova ou ajuste trechos que ficaram obsoletos.",
      "Responda em portugues.",
      "Retorne APENAS o conteudo completo e atualizado do arquivo alvo.",
      "Nao inclua explicacoes extras, comentarios fora do documento ou bloco markdown envolvendo a resposta."
    ].join(" "),
    targetFile: env.docTargetFile,
    existingDocumentation: documentation.target.content,
    contextFiles: documentation.context,
    diff,
    metadata: {
      gitProvider: event.gitProvider,
      owner: event.owner,
      repo: event.repo,
      branch: event.branch,
      oldHash: event.oldHash,
      newHash: event.newHash
    }
  };
}

async function processEvent(event, logger, llmProvider) {
  const repoPath = await cloneRepository({
    gitProvider: event.gitProvider,
    owner: event.owner,
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

  const documentation = readExistingDocumentation({
    repoPath,
    targetFile: env.docTargetFile,
    contextFiles: env.docContextFiles
  });

  logger.info("Documentacao existente carregada", {
    repo: event.repo,
    targetFile: env.docTargetFile,
    targetExists: documentation.target.exists,
    contextFiles: documentation.context.map(file => file.relativePath)
  });

  logger.info("Diff gerado com sucesso", {
    repo: event.repo,
    branch: event.branch,
    preview: diff.substring(0, 800)
  });

  const context = buildDocumentationContext(event, diff, documentation);
  const updatedDocumentation = await llmProvider.generateDocumentation(context);

  logger.info("Documentacao atualizada recebida da LLM", {
    repo: event.repo,
    branch: event.branch,
    targetFile: env.docTargetFile,
    preview: updatedDocumentation.substring(0, 800)
  });

  const committed = await commitAndPushDocumentation({
    repoPath,
    targetFile: env.docTargetFile,
    content: updatedDocumentation,
    baseBranch: event.branch,
    logger
  });

  if (committed) {
    logger.info("Documentacao persistida no repositorio", {
      repo: event.repo,
      baseBranch: event.branch,
      docBranch:
        env.docBranchStrategy === "dedicated" ? env.docBranch : event.branch,
      targetFile: env.docTargetFile
    });
  }
}

/**
 * @param {{ consumer: import("../../queue/queue.contract.js").QueueConsumer, logger: import("../../common/logger.js").Logger }} params
 */
export async function startWorker({ consumer, logger }) {
  const llmProvider = await createLLMProvider();

  logger.info("Worker aguardando mensagens na fila", {
    queue: env.rabbitmqQueue,
    llmProvider: env.llmProvider,
    docTargetFile: env.docTargetFile,
    docBranchStrategy: env.docBranchStrategy,
    docBranch: env.docBranch
  });

  await consumer.consume(async (event, { ack, nack, republish }) => {
    logger.info("Worker processando evento", {
      gitProvider: event.gitProvider,
      owner: event.owner,
      repo: event.repo,
      branch: event.branch,
      attempts: event.attempts || 0
    });

    try {
      await processEvent(event, logger, llmProvider);
      ack();
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
        await republish({
          ...event,
          attempts
        });
        ack();
        logger.warn("Evento reenfileirado para nova tentativa", {
          repo: event.repo,
          branch: event.branch,
          attempts
        });
        return;
      }

      nack(false);
      logger.error("Evento enviado para dead-letter apos esgotar tentativas", {
        repo: event.repo,
        branch: event.branch,
        attempts
      });
    }
  });
}
