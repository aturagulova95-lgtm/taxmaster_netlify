// netlify/functions/chat.js
// CommonJS format — required for Netlify Functions
// Deploy: set OPENAI_API_KEY in Netlify → Site settings → Environment variables

const handler = async (event) => {
  // CORS headers — allow requests from any origin
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // If no API key — return fallback (don't crash)
  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: 'Напишите напрямую в WhatsApp: +7 747 658-94-12 — Жанибек разберёт ваш вопрос лично.'
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'messages array required' })
      };
    }

    const systemPrompt = `Ты — налоговый ассистент TaxMaster KZ (Казахстан). Отвечаешь на вопросы по Налоговому кодексу РК 2026.

ПРАЙС-ЛИСТ:
- Закрытие ИП — от 10 000 ₸
- Нулевая отчётность (100, 200, 220, 270, 300, 700, 851, 910) — 5 000 ₸
- Отчётность с заполнением данных — от 10 000 ₸
- Смена режима налогообложения — 2 500 ₸
- Зачёт/возврат налогов — 2 500 ₸
- Постановка/снятие с учёта по НДС — 2 500 ₸
- АВР / счёт на оплату — от 5 000 ₸
- СНТ, ЭСФ — от 5 000 ₸
- Восстановление учёта — от 15 000 ₸
- Исключение из списка бездействующих — от 15 000 ₸
- Консультация — от 10 000 ₸
- Полное сопровождение бизнеса — по договорённости

КЛЮЧЕВЫЕ НОРМЫ НК РК 2026:
- НДС — 16% (порог регистрации 600 000 МРП)
- КПН — 20%
- ИПН — 10%
- ОПВ — 10%, СО — 3,5%, ОСМС — 3%+2%
- 1 МРП = 4 318 ₸, 1 МЗП = 85 000 ₸
- Форма 910 (ИП ОУР): сдача до 15 авг / 15 фев, уплата до 25 авг / 25 фев
- Штраф за несдачу декларации: 15 МРП первый раз, 30 МРП повторно
- Самозанятые (ИПН 0%): 40 разрешённых видов деятельности
- С 2026 запрещено применять СУР для: налоговых консультантов, бухгалтеров, юристов, строителей, финансистов и др.

СТИЛЬ:
- Отвечай кратко и по делу, на русском языке
- Объясняй простым языком без юридических штампов
- В конце ВСЕГДА предлагай: "Нужна личная консультация? Пишите Жанибеку в WhatsApp: +7 747 658-94-12"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reply: 'Временная ошибка. Напишите в WhatsApp: +7 747 658-94-12'
        })
      };
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content
      || 'Напишите в WhatsApp: +7 747 658-94-12 — Жанибек ответит лично.';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };

  } catch (e) {
    console.error('Function error:', e);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: 'Сейчас бот временно недоступен. Напишите в WhatsApp: +7 747 658-94-12'
      })
    };
  }
};

module.exports = { handler };
