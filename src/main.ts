import { Plugin } from "obsidian";
import { SeedlingSettings, SeedlingSettingTab, DEFAULT_SETTINGS } from "./settings";
import { OllamaClient } from "./clients/ollama";
import { JobManager } from "./utils/jobs";
import { ProgressView, VIEW_TYPE_SEEDLING_PROGRESS } from "./views/ProgressView";
import { runSolveTeach } from "./commands/solveTeach";
import { runCaptionRemix } from "./commands/captionRemix";
import { runVideoStudio } from "./commands/videoStudio";

export default class SeedlingPlugin extends Plugin {
  settings: SeedlingSettings = DEFAULT_SETTINGS;
  ollama!: OllamaClient;
  jobs: JobManager = new JobManager();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.ollama = new OllamaClient(
      this.settings.ollamaEndpoint,
      this.settings.ollamaModel
    );

    this.addSettingTab(new SeedlingSettingTab(this.app, this));

    this.registerView(
      VIEW_TYPE_SEEDLING_PROGRESS,
      (leaf) => new ProgressView(leaf, this.jobs)
    );

    this.addCommand({
      id: "seedling-open-progress",
      name: "진행 현황 패널 열기",
      callback: () => this.activateProgressView(),
    });

    this.addCommand({
      id: "seedling-solve-teach",
      name: "Solve & Teach (문제 풀이)",
      callback: async () => {
        await this.activateProgressView();
        runSolveTeach(this);
      },
    });

    this.addCommand({
      id: "seedling-caption-remix",
      name: "Caption Remix (자막 → 파생)",
      callback: async () => {
        await this.activateProgressView();
        runCaptionRemix(this);
      },
    });

    this.addCommand({
      id: "seedling-video-studio",
      name: "영상제작소 (글 → 대본·프롬프트)",
      callback: async () => {
        await this.activateProgressView();
        runVideoStudio(this);
      },
    });

    this.addRibbonIcon("sprout", "Seedling 진행 현황", () => {
      this.activateProgressView();
    });
  }

  async activateProgressView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_SEEDLING_PROGRESS);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_SEEDLING_PROGRESS, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.ollama.setEndpoint(this.settings.ollamaEndpoint);
    this.ollama.setModel(this.settings.ollamaModel);
  }
}
