// lib/telegramAuth.js
//
// Проверяет, что initData реально пришла от Telegram и не подделана.
// Алгоритм официальный, описан в доках Telegram Web Apps.
//
// БЕЗ ЭТОЙ ПРОВЕРКИ любой человек может открыть консоль браузера
// и отправить на сервер чужой telegram_id — и получить чужие деньги
// или начислить себе баланс напрямую.

const crypto = require('crypto');

/**
 * @param {string} initData - строка initData, которую присылает Telegram.WebApp.initData
 * @param {string} botToken - токен бота (хранится в переменных окружения Vercel, НЕ в коде)
 * @returns {{ ok: boolean, telegramId?: string, authDate?: number, error?: string }}
 */
function verifyTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') {
    return { ok: false, error: 'initData отсутствует' };
  }
  if (!botToken) {
    return { ok: false, error: 'Бот-токен не настроен на сервере' };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    return { ok: false, error: 'Нет hash в initData' };
  }
  params.delete('hash');

  // Собираем data-check-string: все поля отсортированы по алфавиту key=value через \n
  const dataCheckArr = [];
  for (const [key, value] of [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    dataCheckArr.push(`${key}=${value}`);
  }
  const dataCheckString = dataCheckArr.join('\n');

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

  // computed_hash = HMAC_SHA256(secret_key, data_check_string)
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    return { ok: false, error: 'Подпись initData не совпадает — данные подделаны или устарел клиент' };
  }

  // Проверяем свежесть (защита от replay-атак старыми initData)
  const authDate = parseInt(params.get('auth_date') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  const MAX_AGE_SECONDS = 24 * 60 * 60; // initData Telegram обновляет при каждом открытии мини-аппы
  if (now - authDate > MAX_AGE_SECONDS) {
    return { ok: false, error: 'initData устарела, перезапустите приложение' };
  }

  let userObj = null;
  try {
    userObj = JSON.parse(params.get('user') || 'null');
  } catch (e) {
    return { ok: false, error: 'Некорректные данные пользователя' };
  }
  if (!userObj || !userObj.id) {
    return { ok: false, error: 'ID пользователя не найден в initData' };
  }

  return { ok: true, telegramId: String(userObj.id), authDate };
}

module.exports = { verifyTelegramInitData };
