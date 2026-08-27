import type { ReactNode } from "react";

export interface PageHeadProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  /** Compatibility alias used by a few feature screens. */
  action?: ReactNode;
}

export function PageHead({
  eyebrow,
  title,
  description,
  actions,
  action,
}: PageHeadProps) {
  return (
    <div className="page-head">
      <div>
        {eyebrow ? <span className="page-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ?? action ? (
        <div className="page-actions">{actions ?? action}</div>
      ) : null}
    </div>
  );
}
