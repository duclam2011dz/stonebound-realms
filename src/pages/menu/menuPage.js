import { getGameSession, saveMenuSettings } from "../../app/storage/gameSessionStorage.js";
import { MenuUI } from "../../ui/MenuUI.js";

const session = getGameSession();
const menu = new MenuUI(session.settings);

menu.onSettingsChange((patch) => {
  session.settings = { ...session.settings, ...patch };
  saveMenuSettings(session.settings);
});

menu.onPlay(() => {
  saveMenuSettings(session.settings);
  window.location.href = "./create-world.html";
});
