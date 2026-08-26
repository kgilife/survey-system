import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSurveyAnswers, resumeGuestId, resumeUrl } from '../src/surveySync.js';

test('merges changes made to different questions', () => {
  const result = mergeSurveyAnswers({ q1: 'a', q2: 'b' }, { q1: 'local', q2: 'b' }, { q1: 'a', q2: 'remote' });
  assert.deepEqual(result, { merged: { q1: 'local', q2: 'remote' }, conflicts: [] });
});

test('reports conflicting changes to the same question', () => {
  const result = mergeSurveyAnswers({ q1: 'a' }, { q1: 'local' }, { q1: 'remote' });
  assert.deepEqual(result, { merged: { q1: 'local' }, conflicts: ['q1'] });
});

test('reads new hash resume links and legacy search links', () => {
  assert.equal(resumeGuestId({ hash: '#/survey/P1?resume=guest_new', search: '' }), 'guest_new');
  assert.equal(resumeGuestId({ hash: '#/survey/P1', search: '?resume=guest_old' }), 'guest_old');
});

test('creates a GitHub Pages safe hash resume link', () => {
  assert.equal(
    resumeUrl({ origin: 'https://example.github.io', pathname: '/survey/' }, 'P 1', 'guest_1'),
    'https://example.github.io/survey/#/survey/P%201?resume=guest_1',
  );
});
