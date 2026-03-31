const { validateMessage } = require("./validator");

const logSuccess = (msg) => console.log("\x1b[32m%s\x1b[0m", msg);
const logError = (msg) => console.log("\x1b[31m%s\x1b[0m", msg);

async function run() {
    const tests = [
        {
            input: "Нужно починить кран в ванной",
            expected: "TASK"
        },
        {
            input: "Купи крипту сейчас!!!",
            expected: "SPAM"
        },
        {
            input: "Привет, кто ты?",
            expected: "SPAM"
        },
        {
            input: "Кто-то может починить мой туалет завтра?",
            expected: "TASK"
        },
        {
            input: "Привет, как дела?",
            expected: "SPAM"
        },
        {
            input: "Кто-то может станцевать тверк в моем офисе?",
            expected: "SPAM"
        },
        {
            input: "Нужен курьер для доставки посылки завтра",
            expected: "TASK"
        },
        {
            input: "1XBET - лучшие ставки на спорт онлайн!!!",
            expected: "SPAM"
        },
        {
            input: "моя жопа заболела, сделаете минет пожалуйста",
            expected: "SPAM"
        },
    ];

    for (const msg of tests) {
        const result = await validateMessage(msg.input);
        if (result !== msg.expected) {
            logError(`Test failed for input: "${msg.input}". Expected: ${msg.expected}, Got: ${result}`);
        } else {
            logSuccess(`Test passed for input: "${msg.input}". Result: ${result}`);
        }
    }
}

run();