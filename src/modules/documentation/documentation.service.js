import fs from "fs";
import path from "path";

/**
 * @param {string} repoPath
 * @param {string} relativeFilePath
 */
function readDocFile(repoPath, relativeFilePath) {
  const filePath = path.join(repoPath, relativeFilePath);

  if (!fs.existsSync(filePath)) {
    return {
      relativePath: relativeFilePath,
      content: "",
      exists: false
    };
  }

  return {
    relativePath: relativeFilePath,
    content: fs.readFileSync(filePath, "utf8"),
    exists: true
  };
}

/**
 * @param {{ repoPath: string, targetFile: string, contextFiles: string[] }} params
 */
export function readExistingDocumentation({ repoPath, targetFile, contextFiles }) {
  const target = readDocFile(repoPath, targetFile);
  const context = contextFiles
    .filter(file => file !== targetFile)
    .map(file => readDocFile(repoPath, file))
    .filter(file => file.exists && file.content.trim().length > 0);

  return {
    target,
    context
  };
}

/**
 * @param {string} content
 */
export function cleanLlmDocumentationOutput(content) {
  let cleaned = String(content || "").trim();

  if (!cleaned) {
    return "";
  }

  const fencedMatch = cleaned.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);

  if (fencedMatch) {
    cleaned = fencedMatch[1].trim();
  }

  return cleaned;
}

/**
 * @param {{ repoPath: string, targetFile: string, content: string }} params
 */
export function writeDocumentationFile({ repoPath, targetFile, content }) {
  const filePath = path.join(repoPath, targetFile);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}
