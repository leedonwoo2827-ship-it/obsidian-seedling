import { App, Modal, Notice, TFile } from "obsidian";

export interface VideoStudioInput {
  sourceFile: TFile;
  style: string;
  durationSec: number;
}

export class VideoStudioModal extends Modal {
  private resolveFn: (value: VideoStudioInput | null) => void = () => {};
  private style: string;
  private durationSec = 60;
  private sourceFile: TFile | null;

  constructor(
    app: App,
    private stylePresets: string[],
    activeFile: TFile | null
  ) {
    super(app);
    this.style = stylePresets[0] ?? "숏폼";
    this.sourceFile = activeFile;
  }

  open(): Promise<VideoStudioInput | null> {
    return new Promise((resolve) => {
      this.resolveFn = resolve;
      super.open();
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("seedling-modal");
    contentEl.createEl("h3", { text: "🎥 영상제작소" });
    contentEl.createEl("p", {
      cls: "seedling-hint",
      text: "선택한 노트 → 영상 스타일별 성우 대본 · 이미지 프롬프트 · 비디오 프롬프트 번들 생성.",
    });

    // 원본 노트
    contentEl.createEl("label", { text: "원본 노트" });
    const fileSelect = contentEl.createEl("select");
    fileSelect.createEl("option", { text: "— 노트 선택 —", attr: { value: "" } });
    const mdFiles = this.app.vault.getMarkdownFiles();
    for (const f of mdFiles) {
      const opt = fileSelect.createEl("option", {
        text: f.path,
        attr: { value: f.path },
      });
      if (this.sourceFile && f.path === this.sourceFile.path) {
        opt.selected = true;
      }
    }
    fileSelect.addEventListener("change", () => {
      const file = this.app.vault.getAbstractFileByPath(fileSelect.value);
      this.sourceFile = file instanceof TFile ? file : null;
    });

    // 영상 스타일
    contentEl.createEl("label", { text: "영상 스타일" });
    const styleSelect = contentEl.createEl("select");
    for (const s of this.stylePresets) {
      const opt = styleSelect.createEl("option", { text: s, attr: { value: s } });
      if (s === this.style) opt.selected = true;
    }
    styleSelect.addEventListener("change", () => (this.style = styleSelect.value));

    // 길이
    contentEl.createEl("label", { text: "목표 길이 (초)" });
    const durationInput = contentEl.createEl("input", {
      attr: { type: "number", min: "10", max: "600", value: String(this.durationSec) },
    });
    durationInput.addEventListener("input", () => {
      const n = parseInt(durationInput.value);
      if (!isNaN(n)) this.durationSec = n;
    });

    // 버튼
    const actions = contentEl.createDiv({ cls: "seedling-actions" });
    const cancel = actions.createEl("button", { text: "취소" });
    cancel.addEventListener("click", () => {
      this.resolveFn(null);
      this.close();
    });
    const submit = actions.createEl("button", { text: "생성", cls: "mod-cta" });
    submit.addEventListener("click", () => {
      if (!this.sourceFile) {
        new Notice("원본 노트를 선택하세요.");
        return;
      }
      if (this.durationSec < 5) {
        new Notice("길이는 최소 5초 이상이어야 합니다.");
        return;
      }
      this.resolveFn({
        sourceFile: this.sourceFile,
        style: this.style,
        durationSec: this.durationSec,
      });
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
