/** Per-store map of stable atom ids to values (signals). */
export class Registry {
  #entries = new Map<string, unknown>();
  #autoId = 0;

  nextId(prefix = "atom"): string {
    const id = `${prefix}:${this.#autoId}`;
    this.#autoId += 1;
    return id;
  }

  has(id: string): boolean {
    return this.#entries.has(id);
  }

  get<T>(id: string): T | undefined {
    return this.#entries.get(id) as T | undefined;
  }

  set(id: string, value: unknown): void {
    this.#entries.set(id, value);
  }

  delete(id: string): boolean {
    return this.#entries.delete(id);
  }

  clear(): void {
    this.#entries.clear();
  }
}
