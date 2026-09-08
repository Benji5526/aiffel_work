#!/usr/bin/env node

const todoService = require('./services/todoService');

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function formatTodo(todo) {
  const check = todo.completed ? '[x]' : '[ ]';
  const due = todo.due_date ? ` (마감: ${todo.due_date})` : '';
  const tags = todo.tags.length ? ` #${todo.tags.join(' #')}` : '';
  return `${check} ${todo.id}. ${todo.title}${due}${tags}`;
}

function cmdAdd(args) {
  const { flags, positional } = parseFlags(args);
  const title = positional.join(' ');
  const tags = flags.tags ? flags.tags.split(',') : undefined;

  const todo = todoService.addTodo({ title, due_date: flags.due, tags });
  console.log(`추가됨: ${formatTodo(todo)}`);
}

function cmdList(args) {
  const { flags } = parseFlags(args);
  const date = flags.today ? 'today' : undefined;
  const todos = todoService.listTodos({ q: flags.q, tag: flags.tag, date });

  if (!todos.length) {
    console.log('할 일이 없습니다.');
    return;
  }
  todos.forEach((todo) => console.log(formatTodo(todo)));
}

function cmdDone(args) {
  const { positional } = parseFlags(args);
  const id = Number(positional[0]);
  if (!Number.isInteger(id)) {
    console.error('사용법: todo done <id>');
    process.exitCode = 1;
    return;
  }

  const todo = todoService.updateTodo(id, { completed: true });
  if (!todo) {
    console.error(`id=${id} 할 일을 찾을 수 없습니다.`);
    process.exitCode = 1;
    return;
  }
  console.log(`완료 처리됨: ${formatTodo(todo)}`);
}

function cmdSummary() {
  const todos = todoService.summaryToday();
  console.log(`오늘 완료한 할 일: ${todos.length}건`);
  todos.forEach((todo) => console.log(formatTodo(todo)));
}

const USAGE = `사용법:
  todo add <제목> [--due YYYY-MM-DD] [--tags 태그1,태그2]
  todo list [--tag 태그] [--today] [--q 검색어]
  todo done <id>
  todo summary`;

function main() {
  const [command, ...rest] = process.argv.slice(2);

  try {
    switch (command) {
      case 'add':
        return cmdAdd(rest);
      case 'list':
        return cmdList(rest);
      case 'done':
        return cmdDone(rest);
      case 'summary':
        return cmdSummary();
      default:
        console.log(USAGE);
        process.exitCode = command ? 1 : 0;
    }
  } catch (err) {
    console.error(`오류: ${err.message}`);
    process.exitCode = 1;
  }
}

main();
