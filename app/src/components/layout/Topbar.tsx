type TopbarProps = {
  title: string;
  description: string;
  username: string;
  profileSource: "system" | "custom";
};

export function Topbar({ title, username, profileSource }: TopbarProps) {
  return (
    <header className="topbar card shell-topbar-slim shell-topbar-ultra-slim">
      <div className="shell-topbar-copy shell-topbar-copy-slim">
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <div className="card-subtle profile-chip shell-profile-slim">
          <div className="profile-chip-value">{username}</div>
          <div className="profile-chip-meta">{profileSource === "system" ? "系统识别" : "自定义昵称"}</div>
        </div>
      </div>
    </header>
  );
}
