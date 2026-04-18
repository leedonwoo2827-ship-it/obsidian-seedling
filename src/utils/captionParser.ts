export interface ParsedCaption {
  plainText: string;
  cueCount: number;
  format: "srt" | "vtt" | "txt";
}

export function detectFormat(filename: string, content: string): "srt" | "vtt" | "txt" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".srt")) return "srt";
  if (lower.endsWith(".vtt")) return "vtt";
  if (content.trim().startsWith("WEBVTT")) return "vtt";
  if (/^\d+\s*\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/m.test(content)) return "srt";
  return "txt";
}

export function parseCaption(filename: string, content: string): ParsedCaption {
  const format = detectFormat(filename, content);

  if (format === "txt") {
    const cleaned = content.trim();
    return {
      plainText: cleaned,
      cueCount: cleaned.split(/\n\s*\n/).length,
      format,
    };
  }

  const blocks = splitIntoCues(content, format);
  const lines: string[] = [];
  for (const block of blocks) {
    const textLines = block.filter((l) => {
      if (!l.trim()) return false;
      if (/^\d+$/.test(l.trim())) return false;
      if (/-->/i.test(l)) return false;
      if (l.trim().toUpperCase().startsWith("WEBVTT")) return false;
      if (/^(NOTE|STYLE|REGION)\b/i.test(l.trim())) return false;
      return true;
    });
    if (textLines.length > 0) {
      lines.push(textLines.map((l) => l.trim()).join(" "));
    }
  }

  return {
    plainText: lines.join("\n"),
    cueCount: lines.length,
    format,
  };
}

function splitIntoCues(content: string, format: "srt" | "vtt"): string[][] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const chunks = normalized.split(/\n\s*\n/);
  return chunks.map((chunk) => chunk.split("\n")).filter((arr) => arr.length > 0);
}
