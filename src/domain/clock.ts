// Time is injected so domain rules and services are deterministic in tests (AGENTS.md rule 6).
export interface Clock {
  now(): Date;
}

export class FixedClock implements Clock {
  constructor(private instant: Date) {}

  now(): Date {
    return new Date(this.instant.getTime());
  }

  set(instant: Date): void {
    this.instant = instant;
  }
}
