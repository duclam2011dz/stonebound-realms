# Stonebound Realms

A voxel sandbox prototype inspired by classic block worlds. Procedural terrain, day/night cycle, basic lighting, inventory, and block interactions are all in place, with a clean ECS-style architecture and strict TypeScript.

## Features
- Procedural terrain with biomes, caves, and trees.
- Greedy meshing for performant voxel rendering.
- Day/night cycle with sky lighting and block lighting.
- Survival + spectator gamemodes.
- Hotbar + inventory with stack sizes.
- Command system (`/time`, `/tp`, `/effect`, `/gamemode`, `/biome`, `/give`).

## Tech Stack
- TypeScript (strict mode)
- Vite
- Three.js
- ESLint + Prettier

## Getting Started
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open the game: `http://localhost:5173/game.html`

## Scripts
- `npm run dev`: Start Vite dev server.
- `npm run build`: Production build.
- `npm run preview`: Preview build output.
- `npm run typecheck`: TypeScript typecheck (`tsc --noEmit`).
- `npm run lint`: ESLint on source and tools.
- `npm run format`: Prettier on common file types.

## Controls
- Click: lock mouse
- `WASD`: move
- `Space`: jump
- `Shift`: descend (spectator)
- `E`: inventory
- `1-9`: select hotbar slot
- Hold `LMB`: break block
- `RMB`: place block
- `R`: reload chunks
- `T`: chat

## Project Structure
- `src/core`: input, rendering setup, and shared engine utilities
- `src/ecs`: ECS components + world
- `src/game`: main game loop, systems wiring, and commands
- `src/systems`: gameplay systems (movement, chunk streaming, interactions, lighting)
- `src/world`: voxel world, storage, terrain, and meshing
- `src/ui`: HUD, hotbar, menus, chat
- `tools`: test/automation scripts

## CI
GitHub Actions runs lint, typecheck, and format checks on every push and pull request.

## Notes
- The project uses strict TypeScript to keep gameplay logic safe and maintainable.
- If you want a screenshot in the README, place it under `docs/` and reference it here.
