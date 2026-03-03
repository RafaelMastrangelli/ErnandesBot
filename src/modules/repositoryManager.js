import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

export async function cloneRepository({
  workspace,
  repo,
  branch,
  workspaceDir,
  logger
}) {
  const resolvedWorkspaceDir = path.resolve(workspaceDir);
  const repoPath = path.resolve(resolvedWorkspaceDir, repo);

  if (!fs.existsSync(resolvedWorkspaceDir)) {
    fs.mkdirSync(resolvedWorkspaceDir, { recursive: true });
  }

  const repoUrl = `git@bitbucket.org:${workspace}/${repo}.git`;

  const git = simpleGit();

  if (!fs.existsSync(repoPath)) {
    logger.info("Clonando repositorio", { repo });
    await git.clone(repoUrl, repoPath);
  }

  const repoGit = simpleGit(repoPath);

  logger.info("Atualizando branch do repositorio local", {
    repo,
    branch
  });

  await repoGit.fetch();
  await repoGit.checkout(branch);
  await repoGit.pull("origin", branch);

  return repoPath;
}
