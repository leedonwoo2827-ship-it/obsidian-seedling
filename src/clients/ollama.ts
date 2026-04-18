import { requestUrl } from "obsidian";

export interface OllamaGenerateOptions {
  temperature?: number;
  num_predict?: number;
}

export class OllamaClient {
  constructor(
    private endpoint: string,
    private model: string
  ) {}

  setEndpoint(endpoint: string): void {
    this.endpoint = endpoint.replace(/\/+$/, "");
  }

  setModel(model: string): void {
    this.model = model;
  }

  async generate(
    prompt: string,
    system?: string,
    options?: OllamaGenerateOptions
  ): Promise<string> {
    const url = `${this.endpoint.replace(/\/+$/, "")}/api/generate`;
    const body: Record<string, unknown> = {
      model: this.model,
      prompt,
      stream: false,
    };
    if (system) body.system = system;
    if (options) {
      body.options = {
        temperature: options.temperature ?? 0.7,
        ...(options.num_predict ? { num_predict: options.num_predict } : {}),
      };
    }

    const res = await requestUrl({
      url,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify(body),
      throw: false,
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(
        `Ollama ${res.status}: ${res.text?.slice(0, 200) ?? "(no body)"}`
      );
    }

    const data = res.json as { response?: string; error?: string };
    if (data.error) throw new Error(`Ollama error: ${data.error}`);
    return data.response ?? "";
  }

  async listModels(): Promise<string[]> {
    const url = `${this.endpoint.replace(/\/+$/, "")}/api/tags`;
    const res = await requestUrl({ url, method: "GET", throw: false });
    if (res.status < 200 || res.status >= 300) return [];
    const data = res.json as { models?: Array<{ name: string }> };
    return (data.models ?? []).map((m) => m.name);
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const models = await this.listModels();
      if (models.length === 0) {
        return {
          ok: false,
          message: `연결됨. 설치된 모델이 없습니다. 터미널에서 'ollama pull ${this.model}' 실행.`,
        };
      }
      const has = models.includes(this.model);
      return {
        ok: true,
        message: has
          ? `연결됨. 모델 ${this.model} 사용 가능. (총 ${models.length}개)`
          : `연결됨. 모델 ${this.model}이 없습니다. 설치된: ${models.join(", ")}`,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `연결 실패: ${msg}` };
    }
  }
}
