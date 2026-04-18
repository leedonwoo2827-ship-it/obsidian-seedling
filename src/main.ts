import { Plugin } from "obsidian";
import { SeedlingSettings, SeedlingSettingTab, DEFAULT_SETTINGS } from "./settings";
import { OllamaClient } from "./clients/ollama";
import { runSolveTeach } from "./commands/solveTeach";
import { runCaptionRemix } from "./commands/captionRemix";
import { runVideoStudio } from "./commands/videoStudio";

export default class SeedlingPlugin extends Plugin {
  settings: SeedlingSettings = DEFAULT_SETTINGS;
  ollama!: OllamaClient;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.ollama = new OllamaClient(
      this.settings.ollamaEndpoint,
      this.settings.ollamaModel
    );

    this.addSettingTab(new SeedlingSettingTab(this.app, this));

    this.addCommand({
      id: "seedling-solve-teach",
      name: "Solve & Teach (문제 풀이)",
      callback: () => runSolveTeach(this),
    });

    this.addCommand({
      id: "seedling-caption-remix",
      name: "Caption Remix (자막 → 파생)",
      callback: () => runCaptionRemix(this),
    });

    this.addCommand({
      id: "seedling-video-studio",
      name: "영상제작소 (글 → 대본·프롬프트)",
      callback: () => runVideoStudio(this),
    });

    this.addRibbonIcon("sprout", "Seedling", () => {
      runSolveTeach(this);
    });
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
