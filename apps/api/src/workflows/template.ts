const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function renderTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(TOKEN, (_match, path: string) => {
    let value: unknown = context;
    for (const part of path.split(".")) {
      if (typeof value !== "object" || value === null) return "";
      value = (value as Record<string, unknown>)[part];
    }
    return typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
      ? String(value)
      : "";
  });
}
