import type { ReactNode } from "react";

type InfoCardProps = {
  title: string;
  value: string;
  detail: string;
  footer?: ReactNode;
};

export function InfoCard({ title, value, detail, footer }: InfoCardProps) {
  return (
    <section className="card info-card">
      <div className="card-label">{title}</div>
      <div className="card-value">{value}</div>
      <div className="card-detail">{detail}</div>
      {footer ? <div className="card-footer">{footer}</div> : null}
    </section>
  );
}
