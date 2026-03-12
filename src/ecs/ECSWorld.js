export class ECSWorld {
  constructor() {
    this.nextEntityId = 1;
    this.components = new Map();
  }

  createEntity() {
    const entityId = this.nextEntityId;
    this.nextEntityId += 1;
    return entityId;
  }

  removeEntity(entityId) {
    for (const componentMap of this.components.values()) {
      componentMap.delete(entityId);
    }
  }

  addComponent(entityId, componentName, componentData) {
    if (!this.components.has(componentName)) {
      this.components.set(componentName, new Map());
    }
    this.components.get(componentName).set(entityId, componentData);
  }

  removeComponent(entityId, componentName) {
    this.components.get(componentName)?.delete(entityId);
  }

  getComponent(entityId, componentName) {
    return this.components.get(componentName)?.get(entityId) ?? null;
  }

  getEntitiesWith(componentNames) {
    if (!componentNames.length) return [];
    const [first, ...rest] = componentNames;
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
