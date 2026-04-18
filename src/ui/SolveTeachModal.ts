import { App, Modal, Setting } from "obsidian";

export interface SolveTeachInput {
  subject: string;
  problem: string;
}

export class SolveTeachModal extends Modal {
  private subject = "";
  private problem = "";
  private resolveFn: (value: SolveTeachInput | null) => void = () => {};

  constructor(app: App) {
    super(app);
  }

  open(): Promise<SolveTeachInput | null> {
    return new Promise((resolve) => {
      this.resolveFn = resolve;
      super.open();
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("seedling-modal");
    contentEl.createEl("h3", { text: "🧑‍🏫 Solve & Teach" });
    contentEl.createEl("p", {
      cls: "seedling-hint",
      text: "시험/기출 문제를 붙여넣으면 정답·풀이·이론·연결 개념을 노트로 생성합니다.",
    });

    new Setting(contentEl)
      .setName("과목/영역 (선택)")
      .setDesc("예: 수능 국어, 전기기사, 토익 Part5")
      .addText((t) =>
        t.setPlaceholder("수능 국어").onChange((v) => (this.subject = v))
      );

    contentEl.createEl("label", { text: "문제 전문" });
    const textarea = contentEl.createEl("textarea", {
      attr: { rows: "12", placeholder: "문제를 여기에 붙여넣으세요..." },
    });
    textarea.addEventListener("input", () => (this.problem = textarea.value));
    textarea.focus();

    const actions = contentEl.createDiv({ cls: "seedling-actions" });
    const cancelBtn = actions.createEl("button", { text: "취소" });
    cancelBtn.addEventListener("click", () => {
      this.resolveFn(null);
      this.close();
    });

    const submitBtn = actions.createEl("button", {
      text: "생성",
      cls: "mod-cta",
    });
    submitBtn.addEventListener("click", () => {
      if (!this.problem.trim()) {
        textarea.focus();
        return;
      }
      this.resolveFn({ subject: this.subject.trim(), problem: this.problem.trim() });
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
