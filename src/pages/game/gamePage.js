import { getGameSession } from "../../app/storage/gameSessionStorage.js";
import { Game } from "../../game/Game.js";

const session = getGameSession();
const game = new Game({
  settings: session.settings,
  worldName: session.worldName,
  seed: session.seed
});
game.start();
