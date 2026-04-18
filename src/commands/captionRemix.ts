import { Notice } from "obsidian";
import type SeedlingPlugin from "../main";
import { CaptionRemixModal } from "../ui/CaptionRemixModal";
import {
  CAPTION_REMIX_SYSTEM,
  buildCaptionRemixPrompt,
} from "../prompts/captionRemix";
import { parseCaption } from "../utils/captionParser";
import {
  writeToDerived,
  dateStamp,
  sanitizeFilename,
} from "../utils/noteWriter";

export async function runCaptionRemix(plugin: SeedlingPlugin): Promise<void> {
  const modal = new CaptionRemixModal(plugin.app);
  const input = await modal.open();
  if (!input) return;

  const parsed = parseCaption(input.filename, input.content);
  if (!parsed.plainText.trim()) {
    new Notice("자막에서 텍스트를 추출하지 못했습니다.");
    return;
  }

  const notice = new Notice(
    `🎬 Caption Remix 생성 중... (큐 ${parsed.cueCount}개, ${plugin.settings.ollamaModel})`,
    0
  );

  try {
    const prompt = buildCaptionRemixPrompt(input.filename, parsed.plainText);
    const response = await plugin.ollama.generate(prompt, CAPTION_REMIX_SYSTEM, {
      temperature: plugin.settings.temperature,
    });

    const baseName = input.filename.replace(/\.[^.]+$/, "");
    const filename = `${sanitizeFilename(baseName)}-${dateStamp()}`;

    await writeToDerived(
      plugin.app,
      plugin.settings.derivedFolder,
      "caption-remix",
      filename,
      {
        type: "caption-remix",
        created: new Date().toISOString(),
        source: input.filename,
        source_format: parsed.format,
        cue_count: parsed.cueCount,
        model: plugin.settings.ollamaModel,
        tags: ["자막", "파생", "seedling"],
      },
      `# ${baseName} — Caption Remix\n\n## 원본 자막 (정제됨)\n\n\`\`\`\n${parsed.plainText.slice(0, 2000)}${parsed.plainText.length > 2000 ? "\n... (생략)" : ""}\n\`\`\`\n\n---\n\n${response}`
    );

    notice.hide();
  } catch (e) {
    notice.hide();
    const msg = e instanceof Error ? e.message : String(e);
    new Notice(`❌ Caption Remix 실패: ${msg}`, 8000);
  }
}
