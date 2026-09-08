const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const todoService = require('./services/todoService');

const server = new McpServer({
  name: 'todo-app-mcp',
  version: '1.0.0',
});

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function fail(message) {
  return { content: [{ type: 'text', text: message }], isError: true };
}

server.tool(
  'list_todos',
  '할 일 목록을 조회합니다. 검색어, 태그, 오늘 마감 여부로 필터링할 수 있습니다.',
  {
    q: z.string().optional().describe('제목에서 검색할 문자열'),
    date: z.enum(['today']).optional().describe("'today'를 지정하면 오늘 마감인 할 일만 반환"),
    tag: z.string().optional().describe('이 태그가 달린 할 일만 반환'),
  },
  async ({ q, date, tag }) => ok(todoService.listTodos({ q, date, tag }))
);

server.tool(
  'add_todo',
  '새 할 일을 추가합니다.',
  {
    title: z.string().min(1).describe('할 일 제목 (필수)'),
    due_date: z.string().optional().describe('마감일 (YYYY-MM-DD)'),
    tags: z.array(z.string()).optional().describe('태그 이름 목록'),
  },
  async ({ title, due_date, tags }) => {
    try {
      return ok(todoService.addTodo({ title, due_date, tags }));
    } catch (err) {
      return fail(err.message);
    }
  }
);

server.tool(
  'update_todo',
  '기존 할 일을 수정합니다. 전달한 필드만 변경됩니다.',
  {
    id: z.number().int().describe('수정할 할 일의 id'),
    title: z.string().min(1).optional(),
    completed: z.boolean().optional(),
    due_date: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  },
  async ({ id, title, completed, due_date, tags }) => {
    const todo = todoService.updateTodo(id, { title, completed, due_date, tags });
    if (!todo) return fail(`id=${id} 할 일을 찾을 수 없습니다.`);
    return ok(todo);
  }
);

server.tool(
  'delete_todo',
  '할 일을 삭제합니다.',
  {
    id: z.number().int().describe('삭제할 할 일의 id'),
  },
  async ({ id }) => {
    const deleted = todoService.deleteTodo(id);
    if (!deleted) return fail(`id=${id} 할 일을 찾을 수 없습니다.`);
    return ok({ id, deleted: true });
  }
);

server.tool(
  'list_tags',
  '등록된 태그 목록을 조회합니다.',
  {},
  async () => ok(todoService.listTags())
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP 서버 시작 실패:', err);
  process.exit(1);
});
