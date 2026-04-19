import { ItemView, WorkspaceLeaf } from "obsidian";
import type { Job, JobManager } from "../utils/jobs";

export const VIEW_TYPE_SEEDLING_PROGRESS = "seedling-progress";

export class ProgressView extends ItemView {
  private unsubscribe: (() => void) | null = null;
  private refreshInterval: number | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private jobs: JobManager
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_SEEDLING_PROGRESS;
  }

  getDisplayText(): string {
    return "Seedling 진행 현황";
  }

  getIcon(): string {
    return "sprout";
  }

  async onOpen(): Promise<void> {
    this.unsubscribe = this.jobs.subscribe((active, history) => {
      this.render(active, history);
    });

    // Re-render every second to update elapsed time
    this.refreshInterval = window.setInterval(() => {
      this.render(this.jobs.getActive(), this.jobs.getHistory());
    }, 1000);
  }

  async onClose(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.refreshInterval !== null) {
      window.clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private render(active: Job[], history: Job[]): void {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("seedling-progress-view");

    const header = root.createDiv({ cls: "seedling-progress-header" });
    header.createEl("h3", { text: "🌱 Seedling" });

    // ── Active jobs ──
    const activeSection = root.createDiv({ cls: "seedling-progress-section" });
    activeSection.createEl("h4", {
      text: `진행 중 (${active.length})`,
      cls: "seedling-progress-section-title",
    });

    if (active.length === 0) {
      activeSection.createDiv({
        cls: "seedling-progress-empty",
        text: "진행 중인 작업이 없습니다.",
      });
    } else {
      for (const job of active) {
        this.renderActiveJob(activeSection, job);
      }
    }

    // ── History ──
    const historySection = root.createDiv({ cls: "seedling-progress-section" });
    historySection.createEl("h4", {
      text: `최근 기록 (${history.length})`,
      cls: "seedling-progress-section-title",
    });

    if (history.length === 0) {
      historySection.createDiv({
        cls: "seedling-progress-empty",
        text: "아직 실행 기록이 없습니다.",
      });
    } else {
      for (const job of history) {
        this.renderHistoryItem(historySection, job);
      }
    }
  }

  private renderActiveJob(parent: HTMLElement, job: Job): void {
    const card = parent.createDiv({ cls: "seedling-job-card seedling-job-active" });

    const head = card.createDiv({ cls: "seedling-job-head" });
    head.createEl("span", { cls: "seedling-job-label", text: job.label });

    const meta = card.createDiv({ cls: "seedling-job-meta" });
    const elapsed = formatElapsed(Date.now() - job.startTime);
    meta.createEl("span", { text: `⏱ ${elapsed}` });
    meta.createEl("span", { text: `📝 ${job.chunkCount} chunks` });
    meta.createEl("span", { text: `🤖 ${job.model}` });

    const cancelBtn = card.createEl("button", {
      text: "🛑 취소",
      cls: "seedling-job-cancel mod-warning",
    });
    cancelBtn.addEventListener("click", () => {
      this.jobs.cancel(job.id);
    });

    const preview = card.createDiv({ cls: "seedling-job-stream" });
    preview.setText(job.accumText || "응답 대기 중...");
    // Auto-scroll to bottom
    preview.scrollTop = preview.scrollHeight;
  }

  private renderHistoryItem(parent: HTMLElement, job: Job): void {
    const card = parent.createDiv({
      cls: `seedling-job-card seedling-job-${job.status}`,
    });

    const icon =
      job.status === "done"
        ? "✅"
        : job.status === "error"
        ? "❌"
        : job.status === "cancelled"
        ? "🚫"
        : "⏳";

    const head = card.createDiv({ cls: "seedling-job-head" });
    head.createEl("span", { text: `${icon} ${job.label}` });

    const meta = card.createDiv({ cls: "seedling-job-meta" });
    const duration = formatElapsed((job.endTime ?? Date.now()) - job.startTime);
    meta.createEl("span", { text: `${duration} · ${job.chunkCount} chunks` });

    if (job.status === "done" && job.resultPath) {
      const openBtn = card.createEl("a", {
        cls: "seedling-job-open",
        text: `📄 ${job.resultPath}`,
        href: "#",
      });
      openBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.app.workspace.openLinkText(job.resultPath!, "", true);
      });
    }

    if (job.status === "error" && job.error) {
      card.createDiv({
        cls: "seedling-job-error",
        text: `⚠ ${job.error}`,
      });
    }
  }
}

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
