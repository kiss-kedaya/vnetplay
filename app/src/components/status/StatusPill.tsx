import { cn } from "@/lib/utils";

type StatusPillProps = {
  tone: "online" | "warning" | "idle" | "error";
  text: string;
};

export function StatusPill({ tone, text }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm",
        {
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300": tone === "online",
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300": tone === "warning",
          "border-border/70 bg-muted/70 text-muted-foreground": tone === "idle",
          "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300": tone === "error",
        }
      )}
    >
      {text}
    </span>
  );
}
