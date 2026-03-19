/** Shared calendar index for daily meme + motivator (same “day” for both). */
export function getDayIndex(): number {
  const start = new Date("2026-01-01");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86400000);
}
