#!/usr/bin/env node
require('dotenv').config({ quiet: true });

const readline = require('readline');
const memory = require('./services/memoryService');
const { extractMessage } = require('./services/extractAgent');
const { generateReply } = require('./services/replyAgent');

async function handleMessage(customerId, userMessage) {
  const extracted = await extractMessage(userMessage);
  const intent = { intent: extracted.intent, destination: extracted.destination, product: extracted.product };
  const customer = memory.applyExtractedMemory(customerId, extracted);

  const history = memory
    .getRecentMessages(customerId, 20)
    .map((m) => ({ role: m.role === 'gina' ? 'assistant' : 'user', content: m.content }));

  memory.recordMessage(customerId, 'customer', userMessage, intent);

  const reply = await generateReply({ customer, history, userMessage, intent });

  memory.recordMessage(customerId, 'gina', reply, null);

  return { intent, customer, reply };
}

async function chatLoop(customerName) {
  const customer = memory.getOrCreateCustomer('cli', customerName, customerName);
  console.log(`--- ${customerName}님과의 대화 시작 (종료: exit) ---`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const line = await ask('나: ');
    if (!line.trim() || line.trim().toLowerCase() === 'exit') break;

    try {
      const { intent, reply } = await handleMessage(customer.id, line.trim());
      console.log(`   [intent: ${intent.intent}${intent.destination ? `, destination: ${intent.destination}` : ''}]`);
      console.log(`Gina: ${reply}\n`);
    } catch (err) {
      console.error('오류:', err.message);
    }
  }

  rl.close();
}

function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (command === 'chat') {
    const customerName = rest[0] || 'guest';
    return chatLoop(customerName);
  }

  console.log('사용법: node cli.js chat <고객이름>');
}

main();
