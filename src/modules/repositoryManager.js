import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

export async function cloneRepository({ workspace, repo, branch }) {
  const workspaceDir = path.resolve("src/workspace");
  const repoPath = path.resolve(workspaceDir, repo);

  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  const repoUrl = `git@bitbucket.org:${workspace}/${repo}.git`;

  const git = simpleGit();

  if (!fs.existsSync(repoPath)) {
    console.log("Clonando repositório:", repo);
    await git.clone(repoUrl, repoPath);
  }

  const repoGit = simpleGit(repoPath);

  console.log("Atualizando branch:", branch);

  await repoGit.fetch();
  await repoGit.checkout(branch);
  await repoGit.pull("origin", branch);

  return repoPath;
}
