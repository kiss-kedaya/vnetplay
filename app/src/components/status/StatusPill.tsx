import { cn } from "@/lib/utils";

type StatusPillProps = {
  tone: "online" | "warning" | "idle" | "error";
  text: string;
};

export function StatusPill({ tone, text }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        {
          "bg-green-100 text-green-800 border-green-200": tone === "online",
          "bg-yellow-100 text-yellow-800 border-yellow-200": tone === "warning",
          "bg-gray-100 text-gray-600 border-gray-200": tone === "idle",
          "bg-red-100 text-red-800 border-red-200": tone === "error",
        }
      )}
    >
      {text}
    </span>
  );
}
