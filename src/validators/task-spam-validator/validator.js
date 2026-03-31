const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function validateMessage(message) {
    const prompt = `
You are a strict classifier.

Your job is to classify user messages into ONLY one of two categories:
- TASK → if it's a real job/task request (e.g. plumber, repair, cleaning, delivery, etc.)
- SPAM → if it's anything else (ads, nonsense, chatting, insults, random text, etc.)

Rules:
- Output ONLY "TASK" or "SPAM"
- No explanation
- Be strict

Examples:
"I need a plumber to fix my sink" → TASK
"Who are you?" → SPAM
"Cheap crypto investment!!!" → SPAM
"Fix my leaking pipe tomorrow" → TASK

Message:
"${message}"
`;

    const response = await client.responses.create({
        model: 'gpt-4o-mini',
        input: prompt,
    });

    const result = response.output_text.trim();

    if (result !== 'TASK' && result !== 'SPAM') {
        return 'SPAM'; // fallback safety
    }

    return result;
}

module.exports = {
    validateMessage,
}