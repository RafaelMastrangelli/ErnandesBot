import fs from "fs";
import path from "path";

const DEFAULT_SKIP_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  "coverage",
  ".history",
  ".ssh",
  "certs",
  "workspace"
]);

const PRIORITY_FILES = [
  "package.json",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Dockerfile",
  ".env.example",
  "server.js",
  "worker.js",
  "src/app.js",
  "src/config/env.js",
  "src/modules/processing/worker.service.js",
  "src/modules/webhook/webhook.router.js",
  "src/modules/webhook/webhook.handler.js",
  "src/llm/index.js",
  "src/queue/rabbitmq-queue.js",
  "src/modules/repositoryManager.js",
  "src/modules/documentation/documentationCommitter.js"
];

const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".sh",
  ".ps1"
]);

function shouldSkipDir(dirName, ignoredPaths) {
  if (DEFAULT_SKIP_DIR_NAMES.has(dirName)) return true;
  return ignoredPaths.some(ignored => ignored === dirName || ignored.includes(dirName));
}

function walkDirectory(rootPath, currentPath, ignoredPaths, files) {
  let entries;

  try {
    entries = fs.readdirSync(currentPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, absolutePath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name, ignoredPaths)) continue;
      walkDirectory(rootPath, absolutePath, ignoredPaths, files);
      continue;
    }

    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(extension) && !PRIORITY_FILES.includes(relativePath)) {
      continue;
    }

    if (ignoredPaths.some(ignored => relativePath.includes(ignored))) {
      continue;
    }

    let stats;

    try {
      stats = fs.statSync(absolutePath);
    } catch {
      continue;
    }

    files.push({
      relativePath,
      absolutePath,
      size: stats.size,
      priority: PRIORITY_FILES.includes(relativePath) ? 0 : 1
    });
  }
}

function scoreFile(file) {
  let score = file.priority === 0 ? 1000 : 0;
  const relativePath = file.relativePath.toLowerCase();

  if (relativePath === "package.json") score += 500;
  if (relativePath.endsWith("docker-compose.yml")) score += 300;
  if (relativePath.endsWith("dockerfile")) score += 200;
  if (relativePath.startsWith("src/")) score += 100;
  if (relativePath.includes("webhook")) score += 80;
  if (relativePath.includes("worker")) score += 80;
  if (relativePath.includes("llm")) score += 70;
  if (relativePath.includes("queue") || relativePath.includes("rabbit")) score += 60;
  if (relativePath.includes("documentation")) score += 60;
  if (relativePath.endsWith(".md")) score -= 40;
  if (relativePath.includes("cert") || relativePath.includes(".ssh")) score -= 200;

  return score;
}

/**
 * Coleta arvore + conteudo dos arquivos mais relevantes do repositorio.
 * Usado no bootstrap quando o README ainda nao existe.
 *
 * @param {{
 *   repoPath: string,
 *   ignoredPaths: string[],
 *   maxFiles?: number,
 *   maxFileBytes?: number,
 *   maxTotalChars?: number
 * }} params
 */
export function collectRepositoryContext({
  repoPath,
  ignoredPaths,
  maxFiles = 25,
  maxFileBytes = 12000,
  maxTotalChars = 60000
}) {
  const discovered = [];
  walkDirectory(repoPath, repoPath, ignoredPaths, discovered);

  const tree = discovered
    .map(file => file.relativePath)
    .sort((a, b) => a.localeCompare(b));

  const ranked = [...discovered].sort((a, b) => {
    const scoreDiff = scoreFile(b) - scoreFile(a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.relativePath.localeCompare(b.relativePath);
  });

  const selectedFiles = [];
  let totalChars = 0;

  for (const file of ranked) {
    if (selectedFiles.length >= maxFiles) break;
    if (file.size > maxFileBytes * 2) continue;

    let content;

    try {
      content = fs.readFileSync(file.absolutePath, "utf8");
    } catch {
      continue;
    }

    if (!content.trim()) continue;

    if (content.length > maxFileBytes) {
      content = `${content.slice(0, maxFileBytes)}\n\n...[arquivo truncado]...`;
    }

    if (totalChars + content.length > maxTotalChars) {
      break;
    }

    selectedFiles.push({
      relativePath: file.relativePath,
      content
    });
    totalChars += content.length;
  }

  return {
    tree,
    files: selectedFiles,
    stats: {
      totalFilesDiscovered: discovered.length,
      selectedFiles: selectedFiles.length,
      totalChars
    }
  };
}
