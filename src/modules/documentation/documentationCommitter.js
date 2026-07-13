import simpleGit from "simple-git";

import { env } from "../../config/env.js";
import {
  cleanLlmDocumentationOutput,
  writeDocumentationFile
} from "./documentation.service.js";
import {
  prepareDocumentationBranch,
  pushDocumentationBranch
} from "./documentationBranch.js";

/**
 * @param {{ repoPath: string, targetFile: string, content: string, baseBranch: string, logger: import("../../common/logger.js").Logger }} params
 */
export async function commitAndPushDocumentation({
  repoPath,
  targetFile,
  content,
  baseBranch,
  logger
}) {
  const cleanedContent = cleanLlmDocumentationOutput(content);

  if (!cleanedContent) {
    throw new Error("Conteudo de documentacao vazio apos processamento da LLM");
  }

  const git = simpleGit(repoPath);
  const pushBranch = await prepareDocumentationBranch({
    git,
    baseBranch,
    logger
  });

  writeDocumentationFile({
    repoPath,
    targetFile,
    content: cleanedContent
  });

  await git.add(targetFile);

  const status = await git.status();

  if (status.staged.length === 0) {
    logger.info("Documentacao sem alteracoes para commit", {
      targetFile,
      pushBranch
    });
    return false;
  }

  await git.addConfig("user.name", env.docGitUserName);
  await git.addConfig("user.email", env.docGitUserEmail);

  const commitMessage = `${env.docCommitMessage} ${env.docSkipMarker}`.trim();

  await git.commit(commitMessage);

  logger.info("Documentacao commitada localmente", {
    targetFile,
    baseBranch,
    pushBranch,
    commitMessage
  });

  if (!env.docAutoPush) {
    logger.info("Push automatico desabilitado", {
      targetFile,
      pushBranch
    });
    return true;
  }

  await pushDocumentationBranch({ git, branch: pushBranch });

  logger.info("Documentacao enviada para o repositorio remoto", {
    targetFile,
    baseBranch,
    pushBranch,
    prReady: env.docBranchStrategy === "dedicated"
  });

  return true;
}
