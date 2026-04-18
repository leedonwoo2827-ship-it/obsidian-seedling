import { Notice } from "obsidian";
import type SeedlingPlugin from "../main";
import { SolveTeachModal } from "../ui/SolveTeachModal";
import { SOLVE_TEACH_SYSTEM, buildSolveTeachPrompt } from "../prompts/solveTeach";
import { writeToDerived, timestamp, sanitizeFilename } from "../utils/noteWriter";

export async function runSolveTeach(plugin: SeedlingPlugin): Promise<void> {
  const modal = new SolveTeachModal(plugin.app);
  const input = await modal.open();
  if (!input) return;

  const notice = new Notice(`🌱 풀이 생성 중... (${plugin.settings.ollamaModel})`, 0);

  try {
    const prompt = buildSolveTeachPrompt(input.problem, input.subject);
    const response = await plugin.ollama.generate(prompt, SOLVE_TEACH_SYSTEM, {
      temperature: plugin.settings.temperature,
    });

    const slug = sanitizeFilename(
      input.subject || input.problem.slice(0, 30).replace(/\s+/g, "-")
    );
    const filename = `${timestamp()}-${slug}`;

    await writeToDerived(
      plugin.app,
      plugin.settings.derivedFolder,
      "solve-teach",
      filename,
      {
        type: "solve-teach",
        created: new Date().toISOString(),
        subject: input.subject || null,
        source: "시험문제",
        model: plugin.settings.ollamaModel,
        tags: ["해설", "이론", "seedling"],
      },
      `# ${input.subject ? input.subject + " — " : ""}풀이\n\n## 원문 문제\n\n${input.problem}\n\n---\n\n${response}`
    );

    notice.hide();
  } catch (e) {
    notice.hide();
    const msg = e instanceof Error ? e.message : String(e);
    new Notice(`❌ Solve & Teach 실패: ${msg}`, 8000);
  }
}
