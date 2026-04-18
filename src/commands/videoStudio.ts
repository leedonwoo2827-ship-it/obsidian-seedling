import { Notice } from "obsidian";
import type SeedlingPlugin from "../main";
import { VideoStudioModal } from "../ui/VideoStudioModal";
import {
  buildVideoStudioSystem,
  buildVideoStudioPrompt,
} from "../prompts/videoStudio";
import {
  writeToDerived,
  dateStamp,
  sanitizeFilename,
} from "../utils/noteWriter";

export async function runVideoStudio(plugin: SeedlingPlugin): Promise<void> {
  const activeFile = plugin.app.workspace.getActiveFile();
  const modal = new VideoStudioModal(
    plugin.app,
    plugin.settings.videoStylePresets,
    activeFile
  );
  const input = await modal.open();
  if (!input) return;

  const notice = new Notice(
    `🎥 영상제작소 생성 중... (${input.style}, ${input.durationSec}초, ${plugin.settings.ollamaModel})`,
    0
  );

  try {
    const noteContent = await plugin.app.vault.read(input.sourceFile);
    const body = stripFrontmatter(noteContent);
    const title = input.sourceFile.basename;

    const system = buildVideoStudioSystem(input.style, input.durationSec);
    const prompt = buildVideoStudioPrompt(title, body, input.style, input.durationSec);

    const response = await plugin.ollama.generate(prompt, system, {
      temperature: plugin.settings.temperature,
      num_predict: 2048,
    });

    const filename = `${sanitizeFilename(title)}-${input.style}-${dateStamp()}`;

    await writeToDerived(
      plugin.app,
      plugin.settings.derivedFolder,
      "video-studio",
      filename,
      {
        type: "video-studio",
        created: new Date().toISOString(),
        source_note: `[[${title}]]`,
        style: input.style,
        duration_sec: input.durationSec,
        model: plugin.settings.ollamaModel,
        tags: ["영상", "스토리보드", "seedling"],
      },
      `# ${title} — ${input.style} (${input.durationSec}초)\n\n${response}`
    );

    notice.hide();
  } catch (e) {
    notice.hide();
    const msg = e instanceof Error ? e.message : String(e);
    new Notice(`❌ 영상제작소 실패: ${msg}`, 8000);
  }
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return match ? match[1] : content;
}
