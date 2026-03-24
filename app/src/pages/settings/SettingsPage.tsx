import { useEffect, useState } from "react";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { AppSettings } from "../../lib/settings/appSettings";

type SettingsPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  onSaveUsername: (username: string) => void;
  onResetUsername: () => void;
  onSaveSettings: (input: AppSettings) => void;
};

export function SettingsPage({ profile, settings, onSaveUsername, onResetUsername, onSaveSettings }: SettingsPageProps) {
  const [draftUsername, setDraftUsername] = useState(profile.username);
  const [serverBaseUrl, setServerBaseUrl] = useState(settings.serverBaseUrl);
  const [defaultRoomName, setDefaultRoomName] = useState(settings.defaultRoomName);
  const [defaultCommunity, setDefaultCommunity] = useState(settings.defaultCommunity);
  const [supernodeAddress, setSupernodeAddress] = useState(settings.supernodeAddress);
  const [autoConnectOnLaunch, setAutoConnectOnLaunch] = useState(settings.autoConnectOnLaunch);

  useEffect(() => {
    setDraftUsername(profile.username);
  }, [profile.username]);

  useEffect(() => {
    setServerBaseUrl(settings.serverBaseUrl);
    setDefaultRoomName(settings.defaultRoomName);
    setDefaultCommunity(settings.defaultCommunity);
    setSupernodeAddress(settings.supernodeAddress);
    setAutoConnectOnLaunch(settings.autoConnectOnLaunch);
  }, [settings.serverBaseUrl, settings.defaultRoomName, settings.defaultCommunity, settings.supernodeAddress, settings.autoConnectOnLaunch]);

  return (
    <section className="card page-card settings-page">
      <div className="section-header">
        <h2>基础设置</h2>
        <p>不做登录、不做好友系统，当前设备直接使用机器码作为底层标识，房间层只保留昵称展示和服务器连接配置。</p>
      </div>

      <div className="settings-grid">
        <div className="card-subtle settings-block">
          <div className="settings-label">系统用户名</div>
          <div className="settings-value">{profile.systemUsername}</div>
          <div className="settings-meta">当前自动识别来源：{profile.source === "system" ? "直接使用系统用户名" : "已被自定义昵称覆盖"}</div>
          <div className="settings-meta">机器码标识：{profile.machineLabel}</div>
        </div>

        <div className="card-subtle settings-block">
          <label className="settings-label" htmlFor="display-username">显示昵称</label>
          <input id="display-username" className="settings-input" value={draftUsername} onChange={(event) => setDraftUsername(event.target.value)} placeholder="输入房间里显示的昵称" />
          <div className="network-actions settings-actions">
            <button className="primary-button" type="button" onClick={() => onSaveUsername(draftUsername)}>保存昵称</button>
            <button className="ghost-button" type="button" onClick={onResetUsername}>恢复系统用户名</button>
          </div>
        </div>

        <div className="card-subtle settings-block">
          <label className="settings-label" htmlFor="server-base-url">服务器地址</label>
          <input id="server-base-url" className="settings-input" value={serverBaseUrl} onChange={(event) => setServerBaseUrl(event.target.value)} placeholder="http://127.0.0.1:9080" />
          <div className="settings-meta">房间列表、创建房间、加入房间都会走这个地址。</div>
        </div>

        <div className="card-subtle settings-block">
          <label className="settings-label" htmlFor="default-room-name">默认房间名</label>
          <input id="default-room-name" className="settings-input" value={defaultRoomName} onChange={(event) => setDefaultRoomName(event.target.value)} placeholder="my-new-room" />
          <label className="settings-label" htmlFor="default-community">默认 community</label>
          <input id="default-community" className="settings-input" value={defaultCommunity} onChange={(event) => setDefaultCommunity(event.target.value)} placeholder="vnetplay-room" />
          <label className="settings-label" htmlFor="supernode-address">Supernode 地址</label>
          <input id="supernode-address" className="settings-input" value={supernodeAddress} onChange={(event) => setSupernodeAddress(event.target.value)} placeholder="127.0.0.1:7777" />
          <label className="settings-toggle" htmlFor="auto-connect-on-launch">
            <input id="auto-connect-on-launch" type="checkbox" checked={autoConnectOnLaunch} onChange={(event) => setAutoConnectOnLaunch(event.target.checked)} />
            <span>启动网络页时自动连接</span>
          </label>
          <div className="network-actions settings-actions">
            <button className="primary-button" type="button" onClick={() => onSaveSettings({ serverBaseUrl, defaultRoomName, defaultCommunity, supernodeAddress, autoConnectOnLaunch })}>保存连接设置</button>
          </div>
        </div>
      </div>
    </section>
  );
}
