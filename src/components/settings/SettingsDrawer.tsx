import SettingsPanel from "./SettingsPanel";
import "./SettingsDrawer.css";

interface Props { onClose: () => void; }

export default function SettingsDrawer({ onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div className="sd-backdrop" onClick={onClose} />

      {/* Drawer */}
      <div className="sd-drawer">
        <SettingsPanel onClose={onClose} />
      </div>
    </>
  );
}
