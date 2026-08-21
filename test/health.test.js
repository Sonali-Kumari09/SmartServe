// File: backend/test/health.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

function request(path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      http.get(`http://127.0.0.1:${port}${path}`, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
          server.close(() => resolve({ status: response.statusCode, body: JSON.parse(body) }));
        });
      }).on('error', (error) => server.close(() => reject(error)));
    });
  });
}

test('health endpoint reports an available API', async () => {
  const response = await request('/api/health');
  assert.ok([200, 503].includes(response.status));
  assert.ok(['ok', 'degraded'].includes(response.body.status));
  assert.equal(response.body.database, response.status === 200 ? 'postgresql' : 'unavailable');
});

test('unknown endpoints return JSON 404 responses', async () => {
  const response = await request('/api/does-not-exist');
  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Route not found.');
});
