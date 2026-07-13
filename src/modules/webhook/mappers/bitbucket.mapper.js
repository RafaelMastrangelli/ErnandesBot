/**
 * @param {object} payload
 * @returns {import("../push-event.contract.js").PushEvent | null}
 */
export function mapBitbucketPushEvent(payload) {
  const change = payload?.push?.changes?.[0];

  if (!change?.new?.target?.hash) {
    return null;
  }

  const fullName = payload?.repository?.full_name;
  const repoFromFullName =
    typeof fullName === "string" ? fullName.split("/")[1] : null;

  const owner = payload?.repository?.workspace?.slug || null;
  const repo = repoFromFullName || payload?.repository?.name || null;

  if (!owner || !repo) {
    return null;
  }

  return {
    gitProvider: "bitbucket",
    owner,
    repo,
    branch: change.new?.name || null,
    oldHash: change.old?.target?.hash || null,
    newHash: change.new.target.hash,
    attempts: 0
  };
}
