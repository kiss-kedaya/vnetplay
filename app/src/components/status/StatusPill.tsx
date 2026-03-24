type StatusPillProps = {
  tone: "online" | "warning" | "idle";
  text: string;
};

export function StatusPill({ tone, text }: StatusPillProps) {
  return <span className={`status-pill ${tone}`}>{text}</span>;
}
