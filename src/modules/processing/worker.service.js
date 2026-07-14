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
      "Priorize a funcionalidade de negocio sobre detalhes de infraestrutura secundaria (certs, proxy, TLS).",
      "Nao invente portas, comandos, servicos ou tecnologias que nao aparecam nos arquivos fornecidos.",
      "Inclua secoes uteis: o que e o projeto, arquitetura, como funciona, configuracao, como executar.",
      "Responda em portugues.",
      "Retorne APENAS o conteudo completo do README em markdown.",
      "Nao inclua explicacoes extras ou bloco markdown envolvendo a resposta."
    ].join(" "),
    targetFile: env.docTargetFile,
    repositoryTree: repositoryContext.tree,
    repositoryFiles: repositoryContext.files,
    diff,
    metadata: buildMetadata(event)
  };
}

function buildLinkedInContext(event, readmeContent, diff, existingLinkedIn) {
  return {
    mode: "linkedin",
    systemPrompt:
      "Voce e um especialista em comunicacao tecnica para LinkedIn. Escreva posts claros, profissionais e autênticos em portugues.",
    instructions: [
      "Crie uma apresentacao pronta para publicar no LinkedIn sobre este projeto.",
      "Use o README e o diff como fonte da verdade.",
      "Estruture: gancho inicial, problema/contexto, o que foi construido, stack/tecnologias, aprendizados ou impacto, CTA curto e hashtags relevantes.",
      "Tom profissional, humano e objetivo. Evite exageros e clickbait.",
      "Tamanho ideal: entre 800 e 1800 caracteres.",
      existingLinkedIn?.trim()
        ? "Ja existe uma apresentacao anterior. Atualize mantendo o estilo e incorporando mudancas relevantes."
        : "Nao existe apresentacao anterior. Crie a versao inicial.",
      "Retorne APENAS o texto final do post (markdown simples permitido).",
      "Nao envolva a resposta em bloco de codigo."
    ].join(" "),
    targetFile: env.linkedinTargetFile,
    readmeContent,
    diff,
    metadata: buildMetadata(event)
  };
}

async function resolveDiff(event, repoPath, logger) {
  if (!event.newHash) return "";

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

async function generateReadme({
  event,
  repoPath,
  documentation,
  diff,
  llmProvider,
  logger
}) {
  const readmeExists = documentation.target.exists;

  logger.info("Modo de documentacao definido", {
    repo: event.repo,
    targetFile: env.docTargetFile,
    mode: readmeExists ? "incremental" : "bootstrap"
  });

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

    return llmProvider.generateDocumentation(
      buildBootstrapContext(event, repositoryContext, diff)
    );
  }

  if (!diff || diff.trim().length === 0) {
    logger.info("README existente sem diff relevante; mantendo conteudo atual", {
      repo: event.repo
    });
    return documentation.target.content;
  }

  return llmProvider.generateDocumentation(
    buildIncrementalContext(event, diff, documentation)
  );
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

  const linkedInDocumentation = readExistingDocumentation({
    repoPath,
    targetFile: env.linkedinTargetFile,
    contextFiles: []
  });

  const diff = await resolveDiff(event, repoPath, logger);
  const readmeExists = documentation.target.exists;

  if (readmeExists && (!diff || diff.trim().length === 0)) {
    logger.info("Nenhuma alteracao relevante encontrada", {
      repo: event.repo,
      branch: event.branch
    });
    return;
  }

  const readmeContent = await generateReadme({
    event,
    repoPath,
    documentation,
    diff,
    llmProvider,
    logger
  });

  logger.info("README gerado pela LLM", {
    repo: event.repo,
    preview: readmeContent.substring(0, 800)
  });

  const files = [
    {
      path: env.docTargetFile,
      content: readmeContent
    }
  ];

  if (env.linkedinEnabled) {
    const linkedInContent = await llmProvider.generateDocumentation(
      buildLinkedInContext(
        event,
        readmeContent,
        diff,
        linkedInDocumentation.target.content
      )
    );

    logger.info("Apresentacao LinkedIn gerada pela LLM", {
      repo: event.repo,
      targetFile: env.linkedinTargetFile,
      preview: linkedInContent.substring(0, 800)
    });

    files.push({
      path: env.linkedinTargetFile,
      content: linkedInContent
    });
  }

  const result = await commitAndPushDocumentation({
    repoPath,
    files,
    baseBranch: event.branch,
    owner: event.owner,
    repo: event.repo,
    gitProvider: event.gitProvider,
    logger
  });

  if (result.committed) {
    logger.info("Artefatos persistidos no repositorio", {
      repo: event.repo,
      baseBranch: event.branch,
      pushBranch: result.pushBranch,
      files: files.map(file => file.path),
      pullRequestUrl: result.pullRequest?.url || null
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
    linkedinEnabled: env.linkedinEnabled,
    linkedinTargetFile: env.linkedinTargetFile,
    docBranchStrategy: env.docBranchStrategy,
    docBranch: env.docBranch,
    docCreatePullRequest: env.docCreatePullRequest
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
