export function mapPushEvent(payload) {
  const change = payload?.push?.changes?.[0];

  if (!change?.new?.target?.hash) {
    return null;
  }

  const fullName = payload?.repository?.full_name;
  const repoFromFullName =
    typeof fullName === "string" ? fullName.split("/")[1] : null;

  return {
    workspace: payload?.repository?.workspace?.slug || null,
    repo: repoFromFullName || payload?.repository?.name || null,
    branch: change.new?.name || null,
    oldHash: change.old?.target?.hash || null,
    newHash: change.new.target.hash,
    attempts: 0
  };
}
