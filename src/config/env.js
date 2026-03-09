const DEFAULT_IGNORED_DIFF_PATHS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  "coverage"
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
  webhookEventKey: process.env.WEBHOOK_EVENT_KEY || "repo:push",
  workerPollMs: parseNumber(process.env.WORKER_POLL_MS, 3000),
  maxQueueSize: parseNumber(process.env.MAX_QUEUE_SIZE, 1000),
  maxProcessingRetries: parseNumber(process.env.MAX_PROCESSING_RETRIES, 2),
  maxDiffSize: parseNumber(process.env.MAX_DIFF_SIZE, 20000),
  llmProvider: process.env.LLM_PROVIDER || "openai",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  openAiMaxOutputTokens: parseNumber(process.env.OPENAI_MAX_OUTPUT_TOKENS, 1200),
  workspaceDir: process.env.WORKSPACE_DIR || "src/workspace",
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "1mb",
  ignoredDiffPaths: parseList(
    process.env.IGNORED_DIFF_PATHS,
    DEFAULT_IGNORED_DIFF_PATHS
  )
};
