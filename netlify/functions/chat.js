const SYSTEM_PROMPT = `Ты — профессиональный налоговый консультант Казахстана от компании TaxMaster KZ. Отвечай подробно, простым языком, с примерами, как опытный бухгалтер и бывший сотрудник налоговых органов.

Основная специализация:
- ИП и ТОО: регистрация, ведение, закрытие
- Формы отчётности: 910, 200, 220, 100, 700, 300, 851, 270
- НДС: регистрация, ставка 16%, возврат, ЭСФ
- Закрытие ИП: порядок, сроки, ликвидационные декларации
- Уведомления от налоговых органов: виды, сроки, обжалование
- Блокировки счетов: причины, как снять, сроки
- СНТ и ЭСФ: когда выписывать, как оформлять
- Налоги маркетплейсов (Kaspi, Wildberries, OZON)
- Режимы налогообложения РК: ОУР, СУР, патент, розничный налог, самозанятые
- Камеральный контроль и налоговые проверки

НК РК 2026: НДС 16%, КПН 20%, ИПН 10%, ОПВ 10%, СО 3.5%, 1 МРП = 4318 тенге.

В конце каждого ответа добавляй: "📲 Если нужна помощь — напишите Жанибеку в WhatsApp: +7 747 658 94 12"`;

exports.handler = async function(event, context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ reply: "Method not allowed" }) };
  }

  let messages;
  try {
    const body = JSON.parse(event.body);
    messages = body.messages;
    if (!messages || !Array.isArray(messages)) throw new Error("no messages");
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ reply: "Неверный запрос" }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 200, headers, body: JSON.stringify({ reply: "API ключ не настроен. Напишите: +7 747 658 94 12" }) };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.4,
        max_tokens: 800
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("OpenAI error:", res.status, JSON.stringify(data));
      const errMap = {
        401: "Неверный API ключ.",
        402: "Закончился баланс OpenAI.",
        429: "Слишком много запросов, подождите."
      };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reply: (errMap[res.status] || "Ошибка OpenAI: " + res.status) + " Напишите: +7 747 658 94 12" })
      };
    }

    const reply = data.choices[0].message.content.trim();
    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };

  } catch(err) {
    console.error("Error:", err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: "Ошибка соединения. Напишите Жанибеку: WhatsApp +7 747 658 94 12" })
    };
  }
};
