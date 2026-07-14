const DEFAULT_IGNORED_DIFF_PATHS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  "coverage",
  ".history"
];

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseList(value, fallback) {
  if (!value || value.trim().length === 0) return fallback;

  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

export const env = {
  host: process.env.HOST || "0.0.0.0",
  port: parseNumber(process.env.PORT, 3005),
  gitProvider: process.env.GIT_PROVIDER || "",
  githubWebhookEvent: process.env.GITHUB_WEBHOOK_EVENT || "push",
  bitbucketWebhookEventKey: process.env.BITBUCKET_WEBHOOK_EVENT_KEY || "repo:push",
  rabbitmqUrl:
    process.env.RABBITMQ_URL || "amqp://ai-doc:ai-doc@localhost:5672",
  rabbitmqQueue: process.env.RABBITMQ_QUEUE || "ai-doc-agent.events",
  rabbitmqDeadLetterExchange:
    process.env.RABBITMQ_DLX || "ai-doc-agent.dlx",
  rabbitmqDeadLetterQueue:
    process.env.RABBITMQ_DLQ || "ai-doc-agent.events.dlq",
  rabbitmqDeadLetterRoutingKey:
    process.env.RABBITMQ_DLQ_ROUTING_KEY || "events.failed",
  maxQueueSize: parseNumber(process.env.MAX_QUEUE_SIZE, 1000),
  maxProcessingRetries: parseNumber(process.env.MAX_PROCESSING_RETRIES, 2),
  maxDiffSize: parseNumber(process.env.MAX_DIFF_SIZE, 20000),
  llmProvider: process.env.LLM_PROVIDER || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  openAiMaxOutputTokens: parseNumber(process.env.OPENAI_MAX_OUTPUT_TOKENS, 4096),
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  groqMaxOutputTokens: parseNumber(process.env.GROQ_MAX_OUTPUT_TOKENS, 4096),
  workspaceDir: process.env.WORKSPACE_DIR || "src/workspace",
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "1mb",
  ignoredDiffPaths: parseList(
    process.env.IGNORED_DIFF_PATHS,
    DEFAULT_IGNORED_DIFF_PATHS
  ),
  docTargetFile: process.env.DOC_TARGET_FILE || "README.md",
  docContextFiles: parseList(process.env.DOC_CONTEXT_FILES, []),
  docGitUserName: process.env.DOC_GIT_USER_NAME || "ai-doc-agent",
  docGitUserEmail: process.env.DOC_GIT_USER_EMAIL || "ai-doc-agent@local",
  docCommitMessage:
    process.env.DOC_COMMIT_MESSAGE || "docs: atualizacao automatica",
  docSkipMarker: process.env.DOC_SKIP_MARKER || "[ai-doc-agent]",
  docAutoPush: process.env.DOC_AUTO_PUSH !== "false",
  docBranchStrategy: process.env.DOC_BRANCH_STRATEGY || "dedicated",
  docBranch: process.env.DOC_BRANCH || "docs/auto-update",
  docBootstrapMaxFiles: parseNumber(process.env.DOC_BOOTSTRAP_MAX_FILES, 25),
  docBootstrapMaxFileBytes: parseNumber(
    process.env.DOC_BOOTSTRAP_MAX_FILE_BYTES,
    12000
  ),
  docBootstrapMaxTotalChars: parseNumber(
    process.env.DOC_BOOTSTRAP_MAX_TOTAL_CHARS,
    60000
  ),
  linkedinEnabled: process.env.LINKEDIN_ENABLED !== "false",
  linkedinTargetFile:
    process.env.LINKEDIN_TARGET_FILE || "docs/apresentacao-linkedin.md",
  docCreatePullRequest: process.env.DOC_CREATE_PULL_REQUEST !== "false",
  docPullRequestTitle:
    process.env.DOC_PULL_REQUEST_TITLE ||
    "docs: atualizacao automatica de documentacao e LinkedIn",
  docPullRequestBody:
    process.env.DOC_PULL_REQUEST_BODY ||
    "Este PR atualiza automaticamente o README e a apresentacao para LinkedIn gerados pelo ai-doc-agent.",
  githubToken: process.env.GITHUB_TOKEN || ""
};
