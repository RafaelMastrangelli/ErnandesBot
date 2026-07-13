import simpleGit from "simple-git";

export async function getCommitDiff({
  repoPath,
  oldHash,
  newHash,
  ignoredPaths,
  maxDiffSize,
  logger
}) {
  const git = simpleGit(repoPath);

  logger.info("Gerando diff de commits", { oldHash, newHash });

  const rawDiff = await git.diff([
    "--unified=3",
    `${oldHash}..${newHash}`
  ]);

  if (!rawDiff) return "";

  const filtered = rawDiff
    .split("\n")
    .filter(line => {
      return !ignoredPaths.some(ignoredPath => line.includes(ignoredPath));
    })
    .join("\n");

  if (filtered.length > maxDiffSize) {
    logger.warn("Diff muito grande, truncando", {
      size: filtered.length,
      maxDiffSize
    });
    return filtered.substring(0, maxDiffSize);
  }

  return filtered;
}
