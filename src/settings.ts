import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type SeedlingPlugin from "./main";

export interface SeedlingSettings {
  ollamaEndpoint: string;
  ollamaModel: string;
  derivedFolder: string;
  videoStylePresets: string[];
  temperature: number;
}

export const DEFAULT_SETTINGS: SeedlingSettings = {
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "gemma4:e4b",
  derivedFolder: "Derived",
  videoStylePresets: ["다큐", "숏폼", "광고", "설명", "브이로그"],
  temperature: 0.7,
};

export class SeedlingSettingTab extends PluginSettingTab {
  plugin: SeedlingPlugin;

  constructor(app: App, plugin: SeedlingPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "🌱 Seedling 설정" });

    // ─── Ollama 연결 ───
    containerEl.createEl("h3", { text: "🤖 Ollama 연결" });

    new Setting(containerEl)
      .setName("Ollama 엔드포인트")
      .setDesc("기본값: http://localhost:11434")
      .addText((text) =>
        text
          .setPlaceholder("http://localhost:11434")
          .setValue(this.plugin.settings.ollamaEndpoint)
          .onChange(async (value) => {
            this.plugin.settings.ollamaEndpoint = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("모델")
      .setDesc("설치된 Ollama 모델 중 선택. 기본 프리셋은 gemma4:e4b / gemma4:e2b.")
      .addDropdown((dd) => {
        const presets = ["gemma4:e4b", "gemma4:e2b"];
        for (const m of presets) dd.addOption(m, m);
        const current = this.plugin.settings.ollamaModel;
        if (current && !presets.includes(current)) {
          dd.addOption(current, `${current} (커스텀)`);
        }
        dd.setValue(current);
        dd.onChange(async (value) => {
          this.plugin.settings.ollamaModel = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("커스텀 모델명 (선택)")
      .setDesc("위 프리셋 외 다른 모델을 쓰려면 입력 후 엔터. 예: llama3, qwen2.5:7b")
      .addText((text) =>
        text
          .setPlaceholder("")
          .setValue(
            ["gemma4:e4b", "gemma4:e2b"].includes(this.plugin.settings.ollamaModel)
              ? ""
              : this.plugin.settings.ollamaModel
          )
          .onChange(async (value) => {
            const trimmed = value.trim();
            if (!trimmed) return;
            this.plugin.settings.ollamaModel = trimmed;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("연결 테스트")
      .setDesc("Ollama 서버 응답과 모델 설치 여부를 확인합니다.")
      .addButton((btn) =>
        btn.setButtonText("테스트").onClick(async () => {
          btn.setDisabled(true).setButtonText("확인 중...");
          const result = await this.plugin.ollama.testConnection();
          new Notice(result.message, 6000);
          btn.setDisabled(false).setButtonText("테스트");
        })
      );

    new Setting(containerEl)
      .setName("설치된 모델 조회")
      .setDesc("Ollama 서버에 설치된 모델 목록을 확인합니다.")
      .addButton((btn) =>
        btn.setButtonText("조회").onClick(async () => {
          btn.setDisabled(true).setButtonText("조회 중...");
          try {
            const models = await this.plugin.ollama.listModels();
            if (models.length === 0) {
              new Notice("설치된 모델이 없습니다.", 6000);
            } else {
              new Notice(`설치된 모델:\n${models.join("\n")}`, 8000);
            }
          } catch (e) {
            new Notice(`조회 실패: ${e instanceof Error ? e.message : e}`, 6000);
          }
          btn.setDisabled(false).setButtonText("조회");
        })
      );

    new Setting(containerEl)
      .setName("Temperature")
      .setDesc("0(결정적) ~ 1(창의적). 기본 0.7")
      .addText((text) =>
        text
          .setPlaceholder("0.7")
          .setValue(String(this.plugin.settings.temperature))
          .onChange(async (value) => {
            const n = parseFloat(value);
            if (!isNaN(n) && n >= 0 && n <= 2) {
              this.plugin.settings.temperature = n;
              await this.plugin.saveSettings();
            }
          })
      );

    // ─── 출력 ───
    containerEl.createEl("h3", { text: "📁 출력" });

    new Setting(containerEl)
      .setName("Derived 폴더")
      .setDesc("생성된 노트가 저장될 Vault 내 루트 폴더 (하위에 기능별 폴더 자동 생성)")
      .addText((text) =>
        text
          .setPlaceholder("Derived")
          .setValue(this.plugin.settings.derivedFolder)
          .onChange(async (value) => {
            this.plugin.settings.derivedFolder = value.trim() || "Derived";
            await this.plugin.saveSettings();
          })
      );

    // ─── 영상제작소 ───
    containerEl.createEl("h3", { text: "🎬 영상제작소" });

    new Setting(containerEl)
      .setName("영상 스타일 프리셋")
      .setDesc("쉼표로 구분. 예: 다큐, 숏폼, 광고, 설명, 브이로그")
      .addTextArea((ta) =>
        ta
          .setPlaceholder("다큐, 숏폼, 광고, 설명, 브이로그")
          .setValue(this.plugin.settings.videoStylePresets.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.videoStylePresets = value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s);
            await this.plugin.saveSettings();
          })
      );
  }
}
