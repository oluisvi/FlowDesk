import { Card, Skeleton } from "@flowdesk/ui";

export function LoadingPanel({ label = "Carregando…" }: { label?: string }) {
  return (
    <Card className="panel loading-panel" aria-live="polite" aria-busy="true">
      <div className="loading-panel__label">{label}</div>
      <Skeleton style={{ height: 20, width: "34%" }} />
      <Skeleton style={{ height: 180, marginTop: 18 }} />
    </Card>
  );
}
