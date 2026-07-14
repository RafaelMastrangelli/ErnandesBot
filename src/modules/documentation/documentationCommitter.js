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
import { createOrReusePullRequest } from "./githubPullRequest.js";

/**
 * @param {{
 *   repoPath: string,
 *   files: Array<{ path: string, content: string }>,
 *   baseBranch: string,
 *   owner: string,
 *   repo: string,
 *   gitProvider: string,
 *   logger: import("../../common/logger.js").Logger
 * }} params
 */
export async function commitAndPushDocumentation({
  repoPath,
  files,
  baseBranch,
  owner,
  repo,
  gitProvider,
  logger
}) {
  const preparedFiles = (files || [])
    .map(file => ({
      path: file.path,
      content: cleanLlmDocumentationOutput(file.content)
    }))
    .filter(file => file.path && file.content);

  if (preparedFiles.length === 0) {
    throw new Error("Nenhum arquivo de documentacao valido para commit");
  }

  const git = simpleGit(repoPath);
  const pushBranch = await prepareDocumentationBranch({
    git,
    baseBranch,
    logger
  });

  for (const file of preparedFiles) {
    writeDocumentationFile({
      repoPath,
      targetFile: file.path,
      content: file.content
    });
    await git.add(file.path);
  }

  const status = await git.status();

  if (status.staged.length === 0) {
    logger.info("Documentacao sem alteracoes para commit", {
      files: preparedFiles.map(file => file.path),
      pushBranch
    });
    return {
      committed: false,
      pushed: false,
      pushBranch,
      pullRequest: null
    };
  }

  await git.addConfig("user.name", env.docGitUserName);
  await git.addConfig("user.email", env.docGitUserEmail);

  const commitMessage = `${env.docCommitMessage} ${env.docSkipMarker}`.trim();
  await git.commit(commitMessage);

  logger.info("Documentacao commitada localmente", {
    files: preparedFiles.map(file => file.path),
    baseBranch,
    pushBranch,
    commitMessage
  });

  if (!env.docAutoPush) {
    logger.info("Push automatico desabilitado", { pushBranch });
    return {
      committed: true,
      pushed: false,
      pushBranch,
      pullRequest: null
    };
  }

  await pushDocumentationBranch({ git, branch: pushBranch });

  logger.info("Documentacao enviada para o repositorio remoto", {
    files: preparedFiles.map(file => file.path),
    baseBranch,
    pushBranch
  });

  let pullRequest = null;

  if (
    env.docCreatePullRequest &&
    env.docBranchStrategy === "dedicated" &&
    gitProvider === "github"
  ) {
    pullRequest = await createOrReusePullRequest({
      owner,
      repo,
      headBranch: pushBranch,
      baseBranch,
      title: env.docPullRequestTitle,
      body: [
        env.docPullRequestBody,
        "",
        "Arquivos atualizados:",
        ...preparedFiles.map(file => `- \`${file.path}\``),
        "",
        `Gerado automaticamente por ai-doc-agent ${env.docSkipMarker}`
      ].join("\n"),
      token: env.githubToken,
      logger
    });
  }

  return {
    committed: true,
    pushed: true,
    pushBranch,
    pullRequest
  };
}
