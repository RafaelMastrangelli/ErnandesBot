import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

const REPO_URL_BUILDERS = {
  github: ({ owner, repo }) => `git@github.com:${owner}/${repo}.git`,
  bitbucket: ({ owner, repo }) => `git@bitbucket.org:${owner}/${repo}.git`
};

export async function cloneRepository({
  gitProvider,
  owner,
  repo,
  branch,
  workspaceDir,
  logger
}) {
  const buildRepoUrl = REPO_URL_BUILDERS[gitProvider];

  if (!buildRepoUrl) {
    throw new Error(`GIT provider nao suportado para clone: ${gitProvider}`);
  }

  const resolvedWorkspaceDir = path.resolve(workspaceDir);
  const repoPath = path.resolve(resolvedWorkspaceDir, repo);
  const repoUrl = buildRepoUrl({ owner, repo });

  if (!fs.existsSync(resolvedWorkspaceDir)) {
    fs.mkdirSync(resolvedWorkspaceDir, { recursive: true });
  }

  const git = simpleGit();

  if (!fs.existsSync(repoPath)) {
    logger.info("Clonando repositorio", { gitProvider, owner, repo });
    await git.clone(repoUrl, repoPath);
  }

  const repoGit = simpleGit(repoPath);

  logger.info("Atualizando branch do repositorio local", {
    gitProvider,
    owner,
    repo,
    branch
  });

  await repoGit.fetch();
  await repoGit.checkout(branch);
  await repoGit.pull("origin", branch);

  return repoPath;
}
