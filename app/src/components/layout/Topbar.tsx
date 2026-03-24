type TopbarProps = {
  title: string;
  description: string;
  username: string;
  profileSource: "system" | "custom";
};

export function Topbar({ title, description, username, profileSource }: TopbarProps) {
  return (
    <header className="topbar card">
      <div>
        <div className="eyebrow">桌面网络控制</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="topbar-actions">
        <div className="card-subtle profile-chip">
          <div className="profile-chip-label">当前玩家</div>
          <div className="profile-chip-value">{username}</div>
          <div className="profile-chip-meta">{profileSource === "system" ? "系统用户名" : "自定义用户名"}</div>
        </div>
      </div>
    </header>
  );
}
