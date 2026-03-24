type TopbarProps = {
  title: string;
  description: string;
};

export function Topbar({ title, description }: TopbarProps) {
  return (
    <header className="topbar card">
      <div>
        <div className="eyebrow">Vercel 风格控制台</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="topbar-actions">
        <button className="ghost-button" type="button">房间列表</button>
        <button className="primary-button" type="button">启动网络</button>
      </div>
    </header>
  );
}
