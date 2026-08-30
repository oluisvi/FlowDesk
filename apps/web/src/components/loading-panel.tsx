import { Card, Skeleton } from "@flowdesk/ui";

export function LoadingPanel({ label = "Carregando…" }: { label?: string }) {
  return (
    <Card className="panel loading-panel" aria-live="polite" aria-busy="true">
      <div className="loading-panel__status">
        <span className="loading-panel__spinner" aria-hidden="true" />
        <div>
          <strong>{label}</strong>
          <span>Sincronizando os dados mais recentes</span>
        </div>
      </div>
      <Skeleton style={{ height: 20, width: "34%" }} />
      <Skeleton style={{ height: 180, marginTop: 18 }} />
    </Card>
  );
}
