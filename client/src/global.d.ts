export {};

import type { Game } from './game/Game';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
    execute_game_command?: (text: string) => void;
    __game?: Game;
  }
}
