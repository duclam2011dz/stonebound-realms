import { bindFullscreenShortcut } from '../../app/bindFullscreenShortcut';
import { getGameSession } from '../../app/storage/gameSessionStorage';
import { Game } from '../../game/Game';

const session = getGameSession();
bindFullscreenShortcut();
const game = new Game({
  settings: session.settings,
  worldName: session.worldName,
  seed: session.seed
});
game.start();
