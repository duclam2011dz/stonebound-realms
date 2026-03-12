export class ChunkTaskQueue {
  constructor() {
    this.queue = [];
    this.readIndex = 0;
    this.tasksByKey = new Map();
  }

  enqueue(key, task) {
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

  pop() {
    while (this.readIndex < this.queue.length) {
      const key = this.queue[this.readIndex];
      this.readIndex += 1;
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

  get size() {
    return this.tasksByKey.size;
  }
}
