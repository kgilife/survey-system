import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const responder = fs.readFileSync(new URL('../../backend/ApiResponder.gs', import.meta.url), 'utf8');
const database = fs.readFileSync(new URL('../../backend/Database.gs', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api.js', import.meta.url), 'utf8');

test('respondent saves use targeted answer upserts instead of full-table replacement', () => {
  const saveBody = responder.match(/function saveAnswers_\([\s\S]*?\nfunction touchStatus_/i)?.[0] || '';
  assert.match(saveBody, /upsertAnswerRows_/);
  assert.doesNotMatch(saveBody, /replaceAll_/);
  assert.match(database, /function upsertAnswerRows_/);
});

test('respondent API fails fast and only retries transient service failures', () => {
  assert.match(api, /const MAX_ATTEMPTS = 2;/);
  assert.match(api, /const REQUEST_TIMEOUT_MS = 12000;/);
  assert.match(api, /const RETRYABLE_STATUS = new Set\(\[429, 502, 503, 504\]\);/);
  assert.doesNotMatch(api, /RETRYABLE_STATUS[^\n]*404/);
});

test('revision comparison considers both save and submit timestamps', () => {
  assert.match(responder, /function latestRevision_/);
  assert.match(responder, /last_saved_at,status&&status\.last_submitted_at/);
  assert.match(responder, /revision:latestRevision_\(status\)/);
});
