export class ChunkTaskQueue {
  private queue: string[];
  private readIndex: number;
  private tasksByKey: Map<string, ChunkTask>;

  constructor() {
    this.queue = [];
    this.readIndex = 0;
    this.tasksByKey = new Map();
  }

  enqueue(key: string, task: ChunkTask): void {
    const existing = this.tasksByKey.get(key);
    if (existing) {
      existing.forceMesh = existing.forceMesh || task.forceMesh;
      existing.priority = Math.min(existing.priority, task.priority);
      existing.desiredEpoch = Math.max(existing.desiredEpoch, task.desiredEpoch);
      return;
    }
    this.tasksByKey.set(key, task);
    this.queue.push(key);
  }

  pop(): ChunkTask | null {
    while (this.readIndex < this.queue.length) {
      const key = this.queue[this.readIndex];
      this.readIndex += 1;
      if (!key) continue;
      const task = this.tasksByKey.get(key);
      if (!task) continue;
      this.tasksByKey.delete(key);
      if (this.readIndex > 128 && this.readIndex * 2 > this.queue.length) {
        this.queue = this.queue.slice(this.readIndex);
        this.readIndex = 0;
      }
      return task;
    }
    if (this.readIndex !== 0) {
      this.queue.length = 0;
      this.readIndex = 0;
    }
    return null;
  }

  get size(): number {
    return this.tasksByKey.size;
  }
}

export type ChunkTask = {
  key: string;
  cx: number;
  cz: number;
  priority: number;
  forceMesh: boolean;
  desiredEpoch: number;
};
