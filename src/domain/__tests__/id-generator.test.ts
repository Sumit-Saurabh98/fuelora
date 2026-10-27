import { FixedClock } from '../clock';
import { UuidV7Generator, type RandomSource } from '../id-generator';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const T0 = new Date('2026-10-27T10:00:00.000Z');

// Deterministic pseudo-random bytes so failures are reproducible.
function seededRandom(seed = 42): RandomSource {
  let state = seed;
  return (bytes) => {
    for (let i = 0; i < bytes.length; i += 1) {
      state = (state * 1103515245 + 12345) % 2 ** 31;
      bytes[i] = state & 0xff;
    }
  };
}

const maxRandom: RandomSource = (bytes) => bytes.fill(0xff);

function timestampOf(id: string): number {
  return parseInt(id.replace(/-/g, '').slice(0, 12), 16);
}

function expectStrictlyIncreasing(ids: string[]) {
  for (let i = 1; i < ids.length; i += 1) {
    expect(ids[i]! > ids[i - 1]!).toBe(true);
  }
}

describe('UuidV7Generator', () => {
  it('produces RFC 9562 version 7 UUIDs carrying the clock time', () => {
    const id = new UuidV7Generator(new FixedClock(T0), seededRandom()).next();
    expect(id).toMatch(UUID_V7);
    expect(timestampOf(id)).toBe(T0.getTime());
  });

  it('is unique and strictly increasing within the same millisecond', () => {
    const gen = new UuidV7Generator(new FixedClock(T0), seededRandom());
    const ids = Array.from({ length: 10_000 }, () => gen.next());
    expect(new Set(ids).size).toBe(ids.length);
    expectStrictlyIncreasing(ids);
    ids.forEach((id) => expect(id).toMatch(UUID_V7));
  });

  it('keeps increasing when the counter overflows in one millisecond', () => {
    // Max random seeds the counter at 0x7ff, so 0x801 more calls overflow 0xfff.
    const gen = new UuidV7Generator(new FixedClock(T0), maxRandom);
    const ids = Array.from({ length: 0x900 }, () => gen.next());
    expectStrictlyIncreasing(ids);
    expect(timestampOf(ids.at(-1)!)).toBe(T0.getTime() + 1);
  });

  it('sorts by creation time across milliseconds', () => {
    const clock = new FixedClock(T0);
    const gen = new UuidV7Generator(clock, seededRandom());
    const first = gen.next();
    clock.set(new Date(T0.getTime() + 1));
    const second = gen.next();
    expect(second > first).toBe(true);
  });

  it('stays increasing if the device clock steps backwards', () => {
    const clock = new FixedClock(T0);
    const gen = new UuidV7Generator(clock, seededRandom());
    const before = gen.next();
    clock.set(new Date(T0.getTime() - 60_000));
    const after = gen.next();
    expect(after > before).toBe(true);
    expect(timestampOf(after)).toBe(T0.getTime());
  });
});
