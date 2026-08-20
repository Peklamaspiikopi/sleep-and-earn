// lib/atomicIncrement.js
//
// Атомарно прибавляет delta к числовому полю через compare-and-swap
// (UPDATE ... WHERE field = <прочитанное значение>), с повторной
// попыткой при конфликте.
//
// Отличие от паттерна "списание" (request-withdrawal.js, session-start.js):
// там при конфликте правильно ОТКАЗАТЬ (чтобы не списать дважды).
// Здесь мы, наоборот, ВОЗВРАЩАЕМ что-то пользователю (лимит, чекпоинт) —
// отказывать нельзя, иначе возврат просто потеряется. Поэтому при
// конфликте перечитываем актуальное значение и пробуем снова, а не
// сдаёмся сразу.

async function atomicIncrement(supabaseAdmin, table, matchColumns, field, delta, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let selectQuery = supabaseAdmin.from(table).select(field);
    for (const [col, val] of Object.entries(matchColumns)) selectQuery = selectQuery.eq(col, val);
    const { data: row } = await selectQuery.maybeSingle();
    if (!row) return null; // строки не существует — нечего инкрементировать

    const currentValue = row[field];
    let updateQuery = supabaseAdmin.from(table).update({ [field]: currentValue + delta });
    for (const [col, val] of Object.entries(matchColumns)) updateQuery = updateQuery.eq(col, val);
    updateQuery = updateQuery.eq(field, currentValue); // compare-and-swap

    const { data: updated } = await updateQuery.select().maybeSingle();
    if (updated) return updated; // успех

    // Кто-то параллельно изменил то же поле между select и update —
    // перечитываем и пробуем снова, не теряя инкремент.
  }
  return null; // экстремально маловероятно при реальной нагрузке, но не зависаем навечно
}

module.exports = { atomicIncrement };
