import { HomePage } from "../home/HomePage";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { ConnectionContext } from "../../lib/runtime/connectionContext";
import type { AppSettings } from "../../lib/settings/appSettings";

type RoomsPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
};

export function RoomsPage({ profile, settings, connectionContext }: RoomsPageProps) {
  return (
    <HomePage
      profile={profile}
      settings={settings}
      connectionContext={connectionContext}
      onUpdateConnectionContext={() => {
        // rooms page is now a compatibility wrapper for the single room workspace
      }}
    />
  );
}
