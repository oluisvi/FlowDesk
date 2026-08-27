"use client";

import { Keyboard, Move } from "lucide-react";
import { Badge } from "@flowdesk/ui";
import { PageHead } from "@/components/page-head";
import { KanbanBoard } from "./kanban-board";

export function BoardPage() {
  return (
    <div className="page page--board">
      <PageHead
        eyebrow="Pipeline operacional"
        title="Board"
        description="Enxergue o fluxo de trabalho, priorize gargalos e mova tarefas com atualização otimista e rollback seguro."
        actions={
          <div className="board-head-badges">
            <Badge><Move size={11} /> Drag e touch</Badge>
            <Badge><Keyboard size={11} /> Teclado</Badge>
          </div>
        }
      />
      <KanbanBoard />
    </div>
  );
}
