import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './server.js';

const siteOrigin = 'https://buchtech-web.onrender.com';

async function withServer(options, run) {
  const server = await createServer(options);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('health endpoint responds without exposing configuration', async () => {
  await withServer({}, async (base) => {
    const response = await fetch(`${base}/api/health`, { headers: { Origin: siteOrigin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), siteOrigin);
    assert.deepEqual(await response.json(), { ok: true, service: 'buchtech-ai-demo-api' });
  });
});

test('rejects requests from an unapproved website origin', async () => {
  await withServer({}, async (base) => {
    const response = await fetch(`${base}/api/demo`, {
      method: 'POST',
      headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ideas', text: 'A useful community project idea' })
    });
    assert.equal(response.status, 403);
  });
});

test('validates demo payload before making any AI request', async () => {
  let calls = 0;
  await withServer({ fetchImpl: async () => { calls += 1; throw new Error('must not call'); }, apiKey: () => 'test-secret' }, async (base) => {
    const response = await fetch(`${base}/api/demo`, {
      method: 'POST',
      headers: { Origin: siteOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'unknown', text: 'This is enough sample input.' })
    });
    assert.equal(response.status, 400);
    assert.equal(calls, 0);
  });
});

test('calls OpenAI server-side and returns only the generated text', async () => {
  let upstreamRequest;
  await withServer({
    apiKey: () => 'server-only-test-secret',
    fetchImpl: async (url, options) => {
      upstreamRequest = { url, options };
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Three concise project ideas.' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }, async (base) => {
    const response = await fetch(`${base}/api/demo`, {
      method: 'POST',
      headers: { Origin: siteOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ideas', text: 'A lightweight study planner for students' })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { result: 'Three concise project ideas.' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });
  assert.equal(upstreamRequest.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(upstreamRequest.options.headers.Authorization, 'Bearer server-only-test-secret');
  const body = JSON.parse(upstreamRequest.options.body);
  assert.equal(body.model, 'gpt-4.1-mini');
  assert.equal(body.messages[1].content, 'A lightweight study planner for students');
});
