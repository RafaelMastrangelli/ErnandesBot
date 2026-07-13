import simpleGit from "simple-git";

import { env } from "../../config/env.js";

function usesDedicatedDocBranch() {
  if (env.docBranchStrategy === "same") {
    return false;
  }

  if (env.docBranchStrategy === "dedicated") {
    return true;
  }

  throw new Error(
    `DOC_BRANCH_STRATEGY invalido: ${env.docBranchStrategy}. Use: dedicated, same`
  );
}

async function prepareDedicatedBranch(git, baseBranch, docBranch, logger) {
  await git.fetch();

  await git.checkout(baseBranch);
  await git.pull("origin", baseBranch);

  const remoteBase = `origin/${baseBranch}`;
  await git.checkout(["-B", docBranch, remoteBase]);

  logger.info("Branch de documentacao preparada a partir da base", {
    baseBranch,
    docBranch
  });
}

/**
 * @param {{ git: import("simple-git").SimpleGit, baseBranch: string, logger: import("../../common/logger.js").Logger }} params
 * @returns {Promise<string>}
 */
export async function prepareDocumentationBranch({ git, baseBranch, logger }) {
  if (!usesDedicatedDocBranch()) {
    return baseBranch;
  }

  const docBranch = env.docBranch;

  await prepareDedicatedBranch(git, baseBranch, docBranch, logger);

  return docBranch;
}

/**
 * @param {{ git: import("simple-git").SimpleGit, branch: string }} params
 */
export async function pushDocumentationBranch({ git, branch }) {
  if (usesDedicatedDocBranch()) {
    await git.push(["-u", "origin", branch, "--force-with-lease"]);
    return;
  }

  await git.push("origin", branch);
}
