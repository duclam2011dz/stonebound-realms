export class ECSWorld {
  private nextEntityId: number;
  private components: Map<string, Map<number, unknown>>;

  constructor() {
    this.nextEntityId = 1;
    this.components = new Map();
  }

  createEntity(): number {
    const entityId = this.nextEntityId;
    this.nextEntityId += 1;
    return entityId;
  }

  removeEntity(entityId: number): void {
    for (const componentMap of this.components.values()) {
      componentMap.delete(entityId);
    }
  }

  addComponent<T>(entityId: number, componentName: string, componentData: T): void {
    if (!this.components.has(componentName)) {
      this.components.set(componentName, new Map());
    }
    this.components.get(componentName)?.set(entityId, componentData);
  }

  removeComponent(entityId: number, componentName: string): void {
    this.components.get(componentName)?.delete(entityId);
  }

  getComponent<T>(entityId: number, componentName: string): T | null {
    return (this.components.get(componentName)?.get(entityId) as T | undefined) ?? null;
  }

  getEntitiesWith(componentNames: string[]): number[] {
    const first = componentNames[0];
    if (!first) return [];
    const rest = componentNames.slice(1);
    const base = this.components.get(first);
    if (!base) return [];
    const result = [];
    for (const entityId of base.keys()) {
      const hasAll = rest.every((name) => this.components.get(name)?.has(entityId));
      if (hasAll) result.push(entityId);
    }
    return result;
  }
}
