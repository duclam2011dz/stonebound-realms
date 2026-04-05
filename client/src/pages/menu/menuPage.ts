import { bindFullscreenShortcut } from '../../app/bindFullscreenShortcut';
import { getGameSession, saveMenuSettings } from '../../app/storage/gameSessionStorage';
import { MenuUI } from '../../ui/MenuUI';

const session = getGameSession();
const menu = new MenuUI(session.settings);

bindFullscreenShortcut();

menu.onSettingsChange((patch) => {
  session.settings = { ...session.settings, ...patch };
  saveMenuSettings(session.settings);
});

menu.onPlay(() => {
  saveMenuSettings(session.settings);
  window.location.href = './create-world.html';
});
