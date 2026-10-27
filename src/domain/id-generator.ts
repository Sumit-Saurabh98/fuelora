import type { Clock } from './clock';

export interface IdGenerator {
  next(): string;
}

/** Fills the array with random bytes (same shape as crypto.getRandomValues). */
export type RandomSource = (bytes: Uint8Array) => void;

const MAX_COUNTER = 0xfff;
// Seed the per-millisecond counter in the lower half so a burst still has room to increment.
const COUNTER_SEED_MASK = 0x7ff;

/**
 * UUID v7 (RFC 9562): 48-bit Unix milliseconds, 12-bit counter, 62 random bits (LLD §1).
 * IDs from one generator are strictly increasing, even within the same millisecond or if the
 * clock steps backwards, so sorting by id sorts by creation time.
 */
export class UuidV7Generator implements IdGenerator {
  private lastMs = -1;
  private counter = 0;

  constructor(
    private readonly clock: Clock,
    private readonly random: RandomSource,
  ) {}

  next(): string {
    let ms = this.clock.now().getTime();
    if (ms <= this.lastMs) {
      ms = this.lastMs;
      this.counter += 1;
      if (this.counter > MAX_COUNTER) {
        ms += 1;
        this.counter = this.seedCounter();
      }
    } else {
      this.counter = this.seedCounter();
    }
    this.lastMs = ms;

    const bytes = new Uint8Array(16);
    let t = ms;
    for (let i = 5; i >= 0; i -= 1) {
      bytes[i] = t % 256;
      t = Math.floor(t / 256);
    }
    const tail = new Uint8Array(8);
    this.random(tail);
    bytes[6] = 0x70 | ((this.counter >> 8) & 0x0f);
    bytes[7] = this.counter & 0xff;
    bytes.set(tail, 8);
    bytes[8] = 0x80 | ((tail[0] ?? 0) & 0x3f);

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private seedCounter(): number {
    const seed = new Uint8Array(2);
    this.random(seed);
    return (((seed[0] ?? 0) << 8) | (seed[1] ?? 0)) & COUNTER_SEED_MASK;
  }
}
