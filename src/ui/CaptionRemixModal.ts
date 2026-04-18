import { App, Modal, Notice, TFile } from "obsidian";

export interface CaptionRemixInput {
  filename: string;
  content: string;
}

export class CaptionRemixModal extends Modal {
  private resolveFn: (value: CaptionRemixInput | null) => void = () => {};
  private mode: "vault" | "upload" | "paste" = "paste";
  private filenameInput = "";
  private pastedContent = "";
  private uploadedFile: { name: string; content: string } | null = null;
  private selectedVaultFile: TFile | null = null;

  constructor(app: App) {
    super(app);
  }

  open(): Promise<CaptionRemixInput | null> {
    return new Promise((resolve) => {
      this.resolveFn = resolve;
      super.open();
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("seedling-modal");
    contentEl.createEl("h3", { text: "🎬 Caption Remix" });
    contentEl.createEl("p", {
      cls: "seedling-hint",
      text: "자막 파일(.srt/.vtt/.txt)에서 요약·핵심 메시지·파생 콘텐츠 3종을 생성합니다.",
    });

    const tabs = contentEl.createDiv({ cls: "seedling-file-tabs" });
    const bodyWrap = contentEl.createDiv();

    const renderBody = () => {
      bodyWrap.empty();
      if (this.mode === "paste") this.renderPasteMode(bodyWrap);
      else if (this.mode === "upload") this.renderUploadMode(bodyWrap);
      else this.renderVaultMode(bodyWrap);
    };

    const makeTab = (label: string, mode: "paste" | "upload" | "vault") => {
      const btn = tabs.createEl("button", { text: label });
      if (this.mode === mode) btn.addClass("active");
      btn.addEventListener("click", () => {
        this.mode = mode;
        tabs.querySelectorAll("button").forEach((b) => b.removeClass("active"));
        btn.addClass("active");
        renderBody();
      });
    };

    makeTab("붙여넣기", "paste");
    makeTab("파일 업로드", "upload");
    makeTab("Vault 파일", "vault");

    renderBody();

    const actions = contentEl.createDiv({ cls: "seedling-actions" });
    const cancelBtn = actions.createEl("button", { text: "취소" });
    cancelBtn.addEventListener("click", () => {
      this.resolveFn(null);
      this.close();
    });
    const submitBtn = actions.createEl("button", { text: "생성", cls: "mod-cta" });
    submitBtn.addEventListener("click", () => this.submit());
  }

  private renderPasteMode(parent: HTMLElement): void {
    parent.createEl("label", { text: "영상 파일명 (선택)" });
    const nameInput = parent.createEl("input", {
      attr: { type: "text", placeholder: "예: 2026Q1_사내브리핑.mp4" },
    });
    nameInput.addEventListener("input", () => (this.filenameInput = nameInput.value));

    parent.createEl("label", { text: "자막 내용" });
    const ta = parent.createEl("textarea", {
      attr: { rows: "12", placeholder: ".srt / .vtt / .txt 자막 내용을 붙여넣으세요..." },
    });
    ta.addEventListener("input", () => (this.pastedContent = ta.value));
  }

  private renderUploadMode(parent: HTMLElement): void {
    parent.createEl("p", {
      cls: "seedling-hint",
      text: "PC의 자막 파일을 선택하세요. (.srt / .vtt / .txt)",
    });
    const fileInput = parent.createEl("input", {
      attr: { type: "file", accept: ".srt,.vtt,.txt" },
    });
    const status = parent.createDiv({ cls: "seedling-hint" });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const text = await file.text();
      this.uploadedFile = { name: file.name, content: text };
      status.setText(`✓ 로드됨: ${file.name} (${text.length}자)`);
    });
  }

  private renderVaultMode(parent: HTMLElement): void {
    parent.createEl("p", {
      cls: "seedling-hint",
      text: "Vault 내 자막 파일 (.srt/.vtt/.txt/.md)을 선택합니다.",
    });
    const candidates = this.app.vault.getFiles().filter((f) =>
      /\.(srt|vtt|txt|md)$/i.test(f.path)
    );

    const select = parent.createEl("select");
    select.createEl("option", { text: "— 파일 선택 —", attr: { value: "" } });
    for (const f of candidates) {
      select.createEl("option", { text: f.path, attr: { value: f.path } });
    }
    select.addEventListener("change", () => {
      const path = select.value;
      const file = this.app.vault.getAbstractFileByPath(path);
      this.selectedVaultFile = file instanceof TFile ? file : null;
    });
  }

  private async submit(): Promise<void> {
    try {
      let filename = "";
      let content = "";

      if (this.mode === "paste") {
        if (!this.pastedContent.trim()) {
          new Notice("자막 내용이 비어있습니다.");
          return;
        }
        filename = this.filenameInput.trim() || "붙여넣은-자막.txt";
        content = this.pastedContent;
      } else if (this.mode === "upload") {
        if (!this.uploadedFile) {
          new Notice("파일을 먼저 선택하세요.");
          return;
        }
        filename = this.uploadedFile.name;
        content = this.uploadedFile.content;
      } else {
        if (!this.selectedVaultFile) {
          new Notice("Vault 파일을 먼저 선택하세요.");
          return;
        }
        filename = this.selectedVaultFile.name;
        content = await this.app.vault.read(this.selectedVaultFile);
      }

      this.resolveFn({ filename, content });
      this.close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      new Notice(`파일 읽기 실패: ${msg}`);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
