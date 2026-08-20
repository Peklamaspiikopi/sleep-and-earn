// lib/tonAddress.js
//
// Проверка формата TON-адреса (user-friendly, 48 символов base64/base64url)
// вместе с контрольной суммой CRC16, которая зашита в последние 2 байта
// адреса. Это не эксплойт-защита, а защита от опечаток при выплате: без
// этой проверки опечатавшийся в одном символе адреса пользователь мог бы
// безвозвратно потерять реальные деньги при выводе — TON-транзакции
// нельзя отменить или вернуть.
//
// Структура декодированных 36 байт: [tag(1)] [workchain(1)] [hash(32)] [crc16(2)]

function crc16ccitt(bytes) {
  let crc = 0x0000;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
  }
  return crc;
}

function isValidTonAddress(address) {
  if (typeof address !== 'string') return false;
  const trimmed = address.trim();

  // Стандартная user-friendly форма TON-адреса — ровно 48 символов,
  // base64 или base64url алфавит (некоторые кошельки отдают вариант
  // с +/ вместо -_, поддерживаем оба).
  if (!/^[A-Za-z0-9+/_-]{48}$/.test(trimmed)) return false;

  let bytes;
  try {
    const base64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    bytes = Buffer.from(base64, 'base64');
  } catch (e) {
    return false;
  }
  if (bytes.length !== 36) return false;

  const payload = bytes.subarray(0, 34);
  const checksum = bytes.readUInt16BE(34);
  return crc16ccitt(payload) === checksum;
}

module.exports = { isValidTonAddress };
