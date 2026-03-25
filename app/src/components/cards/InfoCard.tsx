import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type InfoCardProps = {
  title: string;
  value: string;
  detail: string;
  footer?: ReactNode;
};

export function InfoCard({ title, value, detail, footer }: InfoCardProps) {
  return (
    <Card className="h-full border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="pb-3">
        <CardDescription className="text-xs uppercase tracking-[0.24em] text-muted-foreground/80">{title}</CardDescription>
        <CardTitle className="text-2xl md:text-3xl break-words">{value}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
        {footer}
      </CardContent>
    </Card>
  );
}
