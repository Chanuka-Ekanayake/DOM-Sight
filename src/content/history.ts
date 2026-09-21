/** Fixed-capacity ring buffer of numeric samples (node counts over time). */
export class History {
  private readonly buf: number[];
  private head = 0; // next write index
  private size = 0;

  constructor(private readonly capacity: number) {
    this.buf = new Array<number>(capacity);
  }

  push(value: number): void {
    this.buf[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }

  /** Oldest → newest. */
  values(): number[] {
    const out: number[] = [];
    const start = (this.head - this.size + this.capacity) % this.capacity;
    for (let i = 0; i < this.size; i++) out.push(this.buf[(start + i) % this.capacity] as number);
    return out;
  }

  latest(): number | undefined {
    if (this.size === 0) return undefined;
    return this.buf[(this.head - 1 + this.capacity) % this.capacity];
  }

  min(): number {
    return this.size === 0 ? 0 : Math.min(...this.values());
  }

  max(): number {
    return this.size === 0 ? 0 : Math.max(...this.values());
  }
}
