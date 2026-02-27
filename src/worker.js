import { cloneRepository } from "./modules/repositoryManager.js";
import { getCommitDiff } from "./modules/diffAnalyzer.js";

export function startWorker(queue) {
  setInterval(async () => {
    if (queue.length === 0) return;

    const event = queue.shift();

    console.log("Worker processando:", event);

    try {
      const repoPath = await cloneRepository(event);

      // Se não houver oldHash (ex: branch criada)
      const oldHash = event.oldHash || `${event.newHash}^`;
      const newHash = event.newHash;

      const diff = await getCommitDiff(repoPath, oldHash, newHash);

      if (!diff || diff.trim().length === 0) {
        console.log("Nenhuma alteração relevante encontrada.");
        return;
      }

      console.log("Diff gerado (primeiros 800 chars):");
      console.log(diff.substring(0, 800));

      // 👉 Aqui depois vamos enviar para LLM

    } catch (err) {
      console.error("Erro no processamento:", err.message);
    }

  }, 3000);
}
