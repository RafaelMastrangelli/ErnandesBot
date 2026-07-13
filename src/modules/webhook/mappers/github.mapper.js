const ZERO_HASH = "0000000000000000000000000000000000000000";

function parseBranch(ref) {
  if (typeof ref !== "string" || !ref.startsWith("refs/heads/")) {
    return null;
  }

  return ref.replace("refs/heads/", "");
}

/**
 * @param {object} payload
 * @returns {import("../push-event.contract.js").PushEvent | null}
 */
export function mapGitHubPushEvent(payload) {
  if (payload?.deleted === true) {
    return null;
  }

  const branch = parseBranch(payload?.ref);
  const newHash = payload?.after;
  const owner = payload?.repository?.owner?.login;

  if (!branch || !newHash || !owner) {
    return null;
  }

  const repo = payload?.repository?.name || null;
  const before = payload?.before;
  const oldHash = before && before !== ZERO_HASH ? before : null;

  return {
    gitProvider: "github",
    owner,
    repo,
    branch,
    oldHash,
    newHash,
    attempts: 0
  };
}
