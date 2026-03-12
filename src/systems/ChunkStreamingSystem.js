export class ChunkStreamingSystem {
  constructor(world, settings) {
    this.world = world;
    this.settings = settings;
    this.lastRenderDistance = -1;
    this.lastLodStartDistance = -1;
  }

  syncStreamingSettings() {
    this.world.setRenderDistance(this.settings.renderDistance);
    this.world.setLodStartDistance(this.settings.lodStartDistance);
    const changed = (
      this.lastRenderDistance !== this.settings.renderDistance
      || this.lastLodStartDistance !== this.settings.lodStartDistance
    );
    this.lastRenderDistance = this.settings.renderDistance;
    this.lastLodStartDistance = this.settings.lodStartDistance;
    return changed;
  }

  update(playerPosition) {
    const settingsChanged = this.syncStreamingSettings();
    this.world.updateVisibleChunksAround(playerPosition, settingsChanged);
    const queueSize = this.world.getPendingChunkCount();
    const maxTasks = queueSize > 240 ? 5 : queueSize > 120 ? 4 : queueSize > 48 ? 3 : 2;
    const timeBudgetMs = queueSize > 240 ? 7.5 : queueSize > 120 ? 6.4 : queueSize > 48 ? 5.6 : 4.5;
    this.world.processChunkQueue(maxTasks, timeBudgetMs);
  }

  force(playerPosition) {
    this.syncStreamingSettings();
    this.world.updateVisibleChunksAround(playerPosition, true);
    this.world.processChunkQueue(32, 18);
  }
}
