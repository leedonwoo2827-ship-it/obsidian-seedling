import { TFile, Vault, MetadataCache } from "obsidian";

export function getFrontmatter(
  file: TFile,
  metadataCache: MetadataCache
): Record<string, any> {
  const cache = metadataCache.getFileCache(file);
  return cache?.frontmatter ? { ...cache.frontmatter } : {};
}

export async function updateFrontmatter(
  file: TFile,
  vault: Vault,
  newProps: Record<string, any>
): Promise<void> {
  const content = await vault.read(file);
  const { body, existing } = parseFrontmatter(content);
  const merged = { ...existing, ...newProps };
  delete merged["position"];
  const yamlStr = objectToYaml(merged);
  const newContent = `---\n${yamlStr}---\n${body}`;
  await vault.modify(file, newContent);
}

export function buildFrontmatterString(props: Record<string, any>): string {
  const yamlStr = objectToYaml(props);
  return `---\n${yamlStr}---\n`;
}

function parseFrontmatter(content: string): {
  body: string;
  existing: Record<string, any>;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { body: content, existing: {} };
  return { body: match[2], existing: yamlToObject(match[1]) };
}

function yamlToObject(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value: any = match[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v: string) => v.trim().replace(/^["']|["']$/g, ""))
        .filter((v: string) => v);
    } else if (value === "" && i + 1 < lines.length && lines[i + 1].match(/^\s+-\s/)) {
      value = [];
      while (i + 1 < lines.length && lines[i + 1].match(/^\s+-\s/)) {
        i++;
        value.push(lines[i].replace(/^\s+-\s*/, "").replace(/^["']|["']$/g, ""));
      }
    } else if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (value === "null" || value === "") value = null;
    else if (/^\d+$/.test(value)) value = parseInt(value);
    else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function objectToYaml(obj: Record<string, any>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) lines.push(`${key}: []`);
      else {
        const items = value.map((v) => quoteIfNeeded(String(v))).join(", ");
        lines.push(`${key}: [${items}]`);
      }
    } else if (value === null) lines.push(`${key}: null`);
    else if (typeof value === "boolean") lines.push(`${key}: ${value}`);
    else if (typeof value === "number") lines.push(`${key}: ${value}`);
    else lines.push(`${key}: ${quoteIfNeeded(String(value))}`);
  }
  return lines.join("\n") + "\n";
}

function quoteIfNeeded(s: string): string {
  if (/[:#\[\]{}&*!|>'"`,@]/.test(s) || s.includes("\n")) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}
