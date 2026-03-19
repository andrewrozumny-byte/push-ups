const PENALTY_MESSAGES: Record<
  1 | 2 | 3,
  (name: string) => string
> = {
  1: (name: string) =>
    `
🚨 <b>УВАГА! ШТРАФ!</b>

😬 <b>${escapeHtml(name)}</b> пропустив 3 дні поспіль!

🍽 Рівень 1: <b>Похід в ресторан для пацанів</b>
За рахунок ${escapeHtml(name)}! 

Готуй гаманець, брате 😂💸`.trim(),

  2: (name: string) =>
    `
🚨🚨 <b>ПОВТОРНИЙ ШТРАФ!</b>

😱 <b>${escapeHtml(name)}</b> знову пропустив 3 дні поспіль!

👩‍❤️‍👨 Рівень 2: <b>Ресторан з дружинами!</b>
За рахунок ${escapeHtml(name)}!

Жони вже знають 😂💸💸`.trim(),

  3: (name: string) =>
    `
🚨🚨🚨 <b>МАКСИМАЛЬНИЙ ШТРАФ!</b>

💀 <b>${escapeHtml(name)}</b> втретє пропустив 3 дні поспіль!!!

🎣 Рівень 3: <b>Риболовля з ночівлею для всіх!</b>
Повністю за рахунок ${escapeHtml(name)}!

Пакуй намети, братва 😂🎣🔥`.trim(),
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID ?? "";

  if (!token || !chatId) {
    console.warn("[penaltyAlarm] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set");
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
}

/**
 * Send group alarm when a user completes another block of 3 consecutive missed days
 * and has an active penalty tier (not brand-new accounts).
 */
export async function checkAndSendPenaltyAlarm(
  userName: string,
  consecutiveMisses: number,
  penaltyLevel: 0 | 1 | 2 | 3
): Promise<void> {
  if (penaltyLevel < 1 || penaltyLevel > 3) return;
  if (consecutiveMisses < 3 || consecutiveMisses % 3 !== 0) return;

  const tier = Math.min(3, Math.floor(consecutiveMisses / 3)) as 1 | 2 | 3;
  if (tier !== penaltyLevel) return;

  const message = PENALTY_MESSAGES[tier]?.(userName);
  if (!message) return;

  try {
    await sendTelegramMessage(message);
  } catch (e) {
    console.error("[penaltyAlarm]", e);
  }
}
