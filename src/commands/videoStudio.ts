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

  const abort = new AbortController();
  const label = `영상제작소 — ${input.sourceFile.basename} (${input.style}, ${input.durationSec}초)`;
  const job = plugin.jobs.start(
    label,
    "video-studio",
    plugin.settings.ollamaModel,
    abort
  );

  try {
    const noteContent = await plugin.app.vault.read(input.sourceFile);
    const body = stripFrontmatter(noteContent);
    const title = input.sourceFile.basename;

    const system = buildVideoStudioSystem(input.style, input.durationSec);
    const prompt = buildVideoStudioPrompt(title, body, input.style, input.durationSec);

    const response = await plugin.ollama.generateStream(
      prompt,
      system,
      {
        temperature: plugin.settings.temperature,
        num_predict: 2048,
      },
      {
        signal: abort.signal,
        onChunk: (token) => plugin.jobs.appendText(job.id, token),
      }
    );

    if (abort.signal.aborted) return;

    const filename = `${sanitizeFilename(title)}-${input.style}-${dateStamp()}`;

    const file = await writeToDerived(
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

    plugin.jobs.complete(job.id, file.path);
  } catch (e) {
    if (abort.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    plugin.jobs.fail(job.id, msg);
    new Notice(`❌ 영상제작소 실패: ${msg}`, 8000);
  }
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return match ? match[1] : content;
}
