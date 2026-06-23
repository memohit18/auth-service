const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseExpiresInToMs(value: string): number {
  const trimmed = value.trim();
  const match = /^(\d+)([smhd])?$/i.exec(trimmed);

  if (!match) {
    throw new Error(`Invalid JWT expires value: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const multiplier = UNITS[unit];

  if (!multiplier) {
    throw new Error(`Invalid JWT expires value: ${value}`);
  }

  return amount * multiplier;
}

export function parseExpiresInToDate(value: string, from = new Date()): Date {
  return new Date(from.getTime() + parseExpiresInToMs(value));
}
