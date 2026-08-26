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

test('respondent API retry limit remains ten attempts', () => {
  assert.match(api, /const MAX_ATTEMPTS = 10;/);
});

test('revision comparison considers both save and submit timestamps', () => {
  assert.match(responder, /function latestRevision_/);
  assert.match(responder, /last_saved_at,status&&status\.last_submitted_at/);
  assert.match(responder, /revision:latestRevision_\(status\)/);
});
