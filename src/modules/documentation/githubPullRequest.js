/**
 * Cria ou reutiliza PR da branch de docs para a branch base (GitHub).
 *
 * @param {{
 *   owner: string,
 *   repo: string,
 *   headBranch: string,
 *   baseBranch: string,
 *   title: string,
 *   body: string,
 *   token: string,
 *   logger: import("../../common/logger.js").Logger
 * }} params
 */
export async function createOrReusePullRequest({
  owner,
  repo,
  headBranch,
  baseBranch,
  title,
  body,
  token,
  logger
}) {
  if (!token) {
    logger.warn("GITHUB_TOKEN nao configurado. PR automatico ignorado", {
      owner,
      repo,
      headBranch,
      baseBranch
    });
    return null;
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-doc-agent"
  };

  const listUrl = new URL(
    `https://api.github.com/repos/${owner}/${repo}/pulls`
  );
  listUrl.searchParams.set("state", "open");
  listUrl.searchParams.set("head", `${owner}:${headBranch}`);
  listUrl.searchParams.set("base", baseBranch);

  const existingResponse = await fetch(listUrl, { headers });

  if (!existingResponse.ok) {
    const details = await existingResponse.text();
    throw new Error(
      `Falha ao consultar PRs abertos (${existingResponse.status}): ${details}`
    );
  }

  const existingPulls = await existingResponse.json();

  if (Array.isArray(existingPulls) && existingPulls.length > 0) {
    const existing = existingPulls[0];
    logger.info("PR ja existente reutilizado", {
      owner,
      repo,
      number: existing.number,
      url: existing.html_url
    });
    return {
      number: existing.number,
      url: existing.html_url,
      reused: true
    };
  }

  const createResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        head: headBranch,
        base: baseBranch,
        body
      })
    }
  );

  if (!createResponse.ok) {
    const details = await createResponse.text();
    throw new Error(
      `Falha ao criar PR (${createResponse.status}): ${details}`
    );
  }

  const created = await createResponse.json();

  logger.info("PR criado com sucesso", {
    owner,
    repo,
    number: created.number,
    url: created.html_url
  });

  return {
    number: created.number,
    url: created.html_url,
    reused: false
  };
}
