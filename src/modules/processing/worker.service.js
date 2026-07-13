import { env } from "../../config/env.js";
import { createLLMProvider } from "../../llm/index.js";
import { cloneRepository } from "../repositoryManager.js";
import { getCommitDiff } from "../diffAnalyzer.js";
import { readExistingDocumentation } from "../documentation/documentation.service.js";
import { collectRepositoryContext } from "../documentation/repositoryContext.js";
import { commitAndPushDocumentation } from "../documentation/documentationCommitter.js";

function buildMetadata(event) {
  return {
    gitProvider: event.gitProvider,
    owner: event.owner,
    repo: event.repo,
    branch: event.branch,
    oldHash: event.oldHash,
    newHash: event.newHash
  };
}

function buildIncrementalContext(event, diff, documentation) {
  return {
    mode: "incremental",
    systemPrompt:
      "Voce e um agente tecnico de documentacao. Atualize documentacao existente de forma clara, objetiva e consistente com o repositorio.",
    instructions: [
      "Voce recebera a documentacao atual do projeto, arquivos de contexto e o diff do ultimo push.",
      "Atualize a documentacao mantendo informacoes validas e incorporando as mudancas do diff.",
      "Remova ou ajuste trechos que ficaram obsoletos.",
      "Nao invente portas, comandos, servicos ou tecnologias que nao estejam na documentacao atual ou no diff.",
      "Responda em portugues.",
      "Retorne APENAS o conteudo completo e atualizado do arquivo alvo.",
      "Nao inclua explicacoes extras, comentarios fora do documento ou bloco markdown envolvendo a resposta."
    ].join(" "),
    targetFile: env.docTargetFile,
    existingDocumentation: documentation.target.content,
    contextFiles: documentation.context,
    diff,
    metadata: buildMetadata(event)
  };
}

function buildBootstrapContext(event, repositoryContext, diff) {
  return {
    mode: "bootstrap",
    systemPrompt:
      "Voce e um agente tecnico de documentacao. Crie um README completo e fiel ao proposito real do repositorio.",
    instructions: [
      "O arquivo alvo ainda nao existe. Faca bootstrap da documentacao com base no contexto total do repositorio.",
      "Analise a estrutura e os arquivos principais para entender o proposito do produto, arquitetura, fluxo e como executar.",
      "Priorize a funcionalidade de negocio (ex.: webhook, fila, worker, LLM, atualizacao de docs) sobre detalhes de infraestrutura secundaria (certs, proxy, TLS), a menos que sejam centrais ao proposito.",
      "Nao invente portas, comandos, servicos ou tecnologias que nao aparecam nos arquivos fornecidos.",
      "Inclua secoes uteis: o que e o projeto, arquitetura, como funciona, configuracao (.env relevantes), como executar e fluxo de documentacao automatica se existir.",
      "Responda em portugues.",
      "Retorne APENAS o conteudo completo do README em markdown.",
      "Nao inclua explicacoes extras, comentarios fora do documento ou bloco markdown envolvendo a resposta."
    ].join(" "),
    targetFile: env.docTargetFile,
    repositoryTree: repositoryContext.tree,
    repositoryFiles: repositoryContext.files,
    diff,
    metadata: buildMetadata(event)
  };
}

async function resolveDiff(event, repoPath, logger) {
  if (!event.newHash) {
    return "";
  }

  try {
    const oldHash = event.oldHash || `${event.newHash}^`;
    return await getCommitDiff({
      repoPath,
      oldHash,
      newHash: event.newHash,
      ignoredPaths: env.ignoredDiffPaths,
      maxDiffSize: env.maxDiffSize,
      logger
    });
  } catch (error) {
    logger.warn("Falha ao gerar diff; seguindo sem diff", {
      message: error?.message || "Erro desconhecido",
      repo: event.repo
    });
    return "";
  }
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

  const documentation = readExistingDocumentation({
    repoPath,
    targetFile: env.docTargetFile,
    contextFiles: env.docContextFiles
  });

  const diff = await resolveDiff(event, repoPath, logger);
  const readmeExists = documentation.target.exists;

  logger.info("Modo de documentacao definido", {
    repo: event.repo,
    targetFile: env.docTargetFile,
    mode: readmeExists ? "incremental" : "bootstrap"
  });

  let context;

  if (!readmeExists) {
    const repositoryContext = collectRepositoryContext({
      repoPath,
      ignoredPaths: env.ignoredDiffPaths,
      maxFiles: env.docBootstrapMaxFiles,
      maxFileBytes: env.docBootstrapMaxFileBytes,
      maxTotalChars: env.docBootstrapMaxTotalChars
    });

    logger.info("Contexto do repositorio coletado para bootstrap", {
      repo: event.repo,
      ...repositoryContext.stats,
      previewFiles: repositoryContext.files.map(file => file.relativePath)
    });

    context = buildBootstrapContext(event, repositoryContext, diff);
  } else {
    if (!diff || diff.trim().length === 0) {
      logger.info("Nenhuma alteracao relevante encontrada", {
        repo: event.repo,
        branch: event.branch
      });
      return;
    }

    logger.info("Documentacao existente carregada", {
      repo: event.repo,
      targetFile: env.docTargetFile,
      contextFiles: documentation.context.map(file => file.relativePath)
    });

    logger.info("Diff gerado com sucesso", {
      repo: event.repo,
      branch: event.branch,
      preview: diff.substring(0, 800)
    });

    context = buildIncrementalContext(event, diff, documentation);
  }

  const updatedDocumentation = await llmProvider.generateDocumentation(context);

  logger.info("Documentacao recebida da LLM", {
    repo: event.repo,
    branch: event.branch,
    mode: context.mode,
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
      mode: context.mode,
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
