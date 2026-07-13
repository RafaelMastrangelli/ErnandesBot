import { env } from "../../../config/env.js";

const ZERO_HASH = "0000000000000000000000000000000000000000";

function parseBranch(ref) {
  if (typeof ref !== "string" || !ref.startsWith("refs/heads/")) {
    return null;
  }

  return ref.replace("refs/heads/", "");
}

function isAgentCommit(payload) {
  const skipMarker = env.docSkipMarker;
  const headMessage = payload?.head_commit?.message;

  if (typeof headMessage === "string" && headMessage.includes(skipMarker)) {
    return true;
  }

  const commits = payload?.commits;

  if (!Array.isArray(commits) || commits.length === 0) {
    return false;
  }

  return commits.every(
    commit =>
      typeof commit?.message === "string" && commit.message.includes(skipMarker)
  );
}

/**
 * @param {object} payload
 * @returns {import("../push-event.contract.js").PushEvent | null}
 */
export function mapGitHubPushEvent(payload) {
  if (payload?.deleted === true) {
    return null;
  }

  if (isAgentCommit(payload)) {
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
