import simpleGit from "simple-git";

const MAX_DIFF_SIZE = 20000; // limite para não explodir LLM

const IGNORED_PATHS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  "coverage"
];

export async function getCommitDiff(repoPath, oldHash, newHash) {
  const git = simpleGit(repoPath);

  console.log("Gerando diff entre:", oldHash, "→", newHash);

  const rawDiff = await git.diff([
    "--unified=3",
    `${oldHash}..${newHash}`
  ]);

  if (!rawDiff) return "";

  const filtered = rawDiff
    .split("\n")
    .filter(line => {
      return !IGNORED_PATHS.some(path => line.includes(path));
    })
    .join("\n");

  if (filtered.length > MAX_DIFF_SIZE) {
    console.log("Diff muito grande, truncando...");
    return filtered.substring(0, MAX_DIFF_SIZE);
  }

  return filtered;
}
