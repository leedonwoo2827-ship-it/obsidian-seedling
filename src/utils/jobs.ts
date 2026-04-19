export type JobStatus = "running" | "done" | "error" | "cancelled";

export interface Job {
  id: string;
  label: string;
  command: "solve-teach" | "caption-remix" | "video-studio";
  model: string;
  startTime: number;
  endTime?: number;
  chunkCount: number;
  accumText: string;
  status: JobStatus;
  resultPath?: string;
  error?: string;
  abortController: AbortController;
}

export type JobListener = (active: Job[], history: Job[]) => void;

const HISTORY_MAX = 10;

export class JobManager {
  private active: Map<string, Job> = new Map();
  private history: Job[] = [];
  private listeners: Set<JobListener> = new Set();

  start(
    label: string,
    command: Job["command"],
    model: string,
    abort: AbortController
  ): Job {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: Job = {
      id,
      label,
      command,
      model,
      startTime: Date.now(),
      chunkCount: 0,
      accumText: "",
      status: "running",
      abortController: abort,
    };
    this.active.set(id, job);
    this.emit();
    return job;
  }

  appendText(id: string, chunk: string): void {
    const job = this.active.get(id);
    if (!job) return;
    job.accumText += chunk;
    job.chunkCount += 1;
    this.emit();
  }

  complete(id: string, resultPath: string): void {
    const job = this.active.get(id);
    if (!job) return;
    job.status = "done";
    job.endTime = Date.now();
    job.resultPath = resultPath;
    this.active.delete(id);
    this.pushHistory(job);
    this.emit();
  }

  fail(id: string, error: string): void {
    const job = this.active.get(id);
    if (!job) return;
    job.status = "error";
    job.endTime = Date.now();
    job.error = error;
    this.active.delete(id);
    this.pushHistory(job);
    this.emit();
  }

  cancel(id: string): void {
    const job = this.active.get(id);
    if (!job) return;
    try {
      job.abortController.abort();
    } catch {
      // ignore
    }
    job.status = "cancelled";
    job.endTime = Date.now();
    this.active.delete(id);
    this.pushHistory(job);
    this.emit();
  }

  getActive(): Job[] {
    return Array.from(this.active.values()).sort(
      (a, b) => b.startTime - a.startTime
    );
  }

  getHistory(): Job[] {
    return [...this.history];
  }

  subscribe(listener: JobListener): () => void {
    this.listeners.add(listener);
    listener(this.getActive(), this.getHistory());
    return () => this.listeners.delete(listener);
  }

  private pushHistory(job: Job): void {
    this.history.unshift(job);
    if (this.history.length > HISTORY_MAX) {
      this.history = this.history.slice(0, HISTORY_MAX);
    }
  }

  private emit(): void {
    const active = this.getActive();
    const history = this.getHistory();
    for (const l of this.listeners) {
      try {
        l(active, history);
      } catch (e) {
        console.warn("JobListener error:", e);
      }
    }
  }
}
