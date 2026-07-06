export function buildExportPayload(
  kind: "vocabulary" | "session",
  data: unknown,
): object {
  const items = Array.isArray(data) ? data : [];

  return {
    app: "wordlens",
    kind,
    exportedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
}

export function downloadJson(filename: string, payload: object): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
