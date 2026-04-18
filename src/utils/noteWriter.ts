import { App, Notice, TFile, TFolder, normalizePath } from "obsidian";
import { buildFrontmatterString } from "./frontmatter";

export async function ensureFolder(app: App, path: string): Promise<void> {
  const norm = normalizePath(path);
  const existing = app.vault.getAbstractFileByPath(norm);
  if (existing instanceof TFolder) return;
  if (existing) throw new Error(`경로 '${norm}'에 파일이 이미 존재합니다 (폴더 아님).`);

  const parts = norm.split("/");
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const node = app.vault.getAbstractFileByPath(current);
    if (!node) {
      await app.vault.createFolder(current);
    }
  }
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes())
  );
}

export function dateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear().toString() + pad(d.getMonth() + 1) + pad(d.getDate());
}

export async function writeToDerived(
  app: App,
  rootFolder: string,
  subFolder: string,
  fileName: string,
  frontmatter: Record<string, unknown>,
  body: string,
  options: { openAfter?: boolean } = {}
): Promise<TFile> {
  const folderPath = normalizePath(`${rootFolder}/${subFolder}`);
  await ensureFolder(app, folderPath);

  const safeName = sanitizeFilename(fileName);
  const ext = safeName.endsWith(".md") ? "" : ".md";
  let finalPath = normalizePath(`${folderPath}/${safeName}${ext}`);

  let counter = 1;
  while (app.vault.getAbstractFileByPath(finalPath)) {
    const base = safeName.replace(/\.md$/, "");
    finalPath = normalizePath(`${folderPath}/${base}-${counter}.md`);
    counter++;
  }

  const fm = buildFrontmatterString(frontmatter);
  const content = `${fm}\n${body}\n`;
  const file = await app.vault.create(finalPath, content);

  if (options.openAfter !== false) {
    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(file);
    new Notice(`🌱 생성 완료: ${finalPath}`, 4000);
  }

  return file;
}
