import { useEffect, useState } from "react";
import type { UserProfile } from "../../lib/profile/userProfile";

type SettingsPageProps = {
  profile: UserProfile;
  onSaveUsername: (username: string) => void;
  onResetUsername: () => void;
};

export function SettingsPage({ profile, onSaveUsername, onResetUsername }: SettingsPageProps) {
  const [draftUsername, setDraftUsername] = useState(profile.username);

  useEffect(() => {
    setDraftUsername(profile.username);
  }, [profile.username]);

  return (
    <section className="card page-card settings-page">
      <div className="section-header">
        <h2>基础设置</h2>
        <p>软件启动时会自动读取当前系统用户名。你也可以在这里改成对外显示的玩家昵称。</p>
      </div>

      <div className="settings-grid">
        <div className="card-subtle settings-block">
          <div className="settings-label">系统用户名</div>
          <div className="settings-value">{profile.systemUsername}</div>
          <div className="settings-meta">当前自动识别来源：{profile.source === "system" ? "直接使用系统用户名" : "已被自定义昵称覆盖"}</div>
        </div>

        <div className="card-subtle settings-block">
          <label className="settings-label" htmlFor="display-username">显示用户名</label>
          <input id="display-username" className="settings-input" value={draftUsername} onChange={(event) => setDraftUsername(event.target.value)} placeholder="输入你的玩家昵称" />
          <div className="network-actions settings-actions">
            <button className="primary-button" type="button" onClick={() => onSaveUsername(draftUsername)}>保存用户名</button>
            <button className="ghost-button" type="button" onClick={onResetUsername}>恢复系统用户名</button>
          </div>
        </div>
      </div>
    </section>
  );
}
