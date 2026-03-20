/**
 * Minimal Telegram Bot API helpers (group chat notifications).
 */

export type SendTelegramMessageOptions = {
  parse_mode?: "HTML";
  disable_web_page_preview?: boolean;
};

export async function sendTelegramMessage(
  text: string,
  options?: SendTelegramMessageOptions
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID ?? "";

  if (!token || !chatId) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skip send"
    );
    return;
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: options?.disable_web_page_preview ?? true,
  };
  if (options?.parse_mode) {
    body.parse_mode = options.parse_mode;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Telegram send failed: ${res.status} ${errBody}`);
  }
}
