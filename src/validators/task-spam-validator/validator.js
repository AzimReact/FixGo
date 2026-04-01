const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function validateMessage(message) {

    const prompt = `
You are a strict classifier that detects spam and offensive content in Kyrgyz and other languages.

Your job is to classify user messages into ONLY one of two categories:
- TASK → if it's a legitimate job/task request (e.g. plumber, repair, cleaning, delivery, etc.)
- SPAM → if it's anything else (ads, nonsense, chatting, insults, random text, profanity, curses, betting ads, betting sites, etc.)

Rules:
- Output ONLY "TASK" or "SPAM"
- No explanation
- Be VERY strict with vulgar language, profanity, and curses in any language (including Kyrgyz)
- Reject messages containing Kyrgyz offensive words (e.g. "чочок сор жалап", "элеген", etc.) as SPAM
- Reject messages with insults or disrespect as SPAM
- STRICTLY REJECT ads for betting/gambling sites (1xbet, BetCity, etc.), cryptocurrencies, and other commercial services as SPAM
- A service request is TASK only if it's genuinely requesting help for a real job/task WITHOUT ads or profanity

Examples:
"I need a plumber to fix my sink" → TASK
"Who are you?" → SPAM
"Cheap crypto investment!!!" → SPAM
"Fix my leaking pipe tomorrow" → TASK
"У меня сломался унитаз марки \"Чочок сор жалап\". Кто-то может починить?" → SPAM (contains Kyrgyz profanity)
"У меня был ремонт. И сломался туалет от фирмы \"1xbet ставки на спорт\". Помогите починить" → SPAM (contains betting site ad)
"Починить кран. Суки бляди в жопу ебутся геи" → SPAM (contains profanity and insults)

Message:
"${message}"
`;

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
    });

    const result = response.choices[0].message.content.trim();

    if (result !== 'TASK' && result !== 'SPAM') {
        return 'SPAM'; // fallback safety
    }

    return result;
}

module.exports = {
    validateMessage,
}