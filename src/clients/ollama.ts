import { requestUrl } from "obsidian";

export interface OllamaGenerateOptions {
  temperature?: number;
  num_predict?: number;
}

export interface StreamCallbacks {
  onChunk?: (token: string) => void;
  signal?: AbortSignal;
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

  getEndpoint(): string {
    return this.endpoint.replace(/\/+$/, "");
  }

  getModel(): string {
    return this.model;
  }

  async generate(
    prompt: string,
    system?: string,
    options?: OllamaGenerateOptions
  ): Promise<string> {
    const url = `${this.getEndpoint()}/api/generate`;
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

  async generateStream(
    prompt: string,
    system: string | undefined,
    options: OllamaGenerateOptions | undefined,
    callbacks: StreamCallbacks
  ): Promise<string> {
    const url = `${this.getEndpoint()}/api/generate`;
    const body: Record<string, unknown> = {
      model: this.model,
      prompt,
      stream: true,
    };
    if (system) body.system = system;
    if (options) {
      body.options = {
        temperature: options.temperature ?? 0.7,
        ...(options.num_predict ? { num_predict: options.num_predict } : {}),
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: callbacks.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Ollama ${response.status}: ${text.slice(0, 200)}`);
    }

    if (!response.body) {
      throw new Error("Ollama: 응답 본문이 비어있습니다 (스트리밍 불가).");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accum = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            const json = JSON.parse(line) as {
              response?: string;
              error?: string;
              done?: boolean;
            };
            if (json.error) throw new Error(`Ollama error: ${json.error}`);
            if (json.response) {
              accum += json.response;
              callbacks.onChunk?.(json.response);
            }
            if (json.done) return accum;
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message.startsWith("Ollama")) {
              throw parseErr;
            }
            console.warn("Ollama ndjson parse skip:", line.slice(0, 100));
          }
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore
      }
    }

    return accum;
  }

  async listModels(): Promise<string[]> {
    const url = `${this.getEndpoint()}/api/tags`;
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
