import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, sanitizeUrl, escapeAttr } from '../src/utils/sanitize.js';

test('sanitize - escapeHtml', async (t) => {
  await t.test('should handle undefined or null', () => {
    assert.equal(escapeHtml(undefined as unknown as string), '');
    assert.equal(escapeHtml(null as unknown as string), '');
  });

  await t.test('should escape HTML characters', () => {
    assert.equal(escapeHtml('<html>'), '&lt;html&gt;');
    assert.equal(escapeHtml('A & B'), 'A &amp; B');
    assert.equal(escapeHtml('"hello"'), '&quot;hello&quot;');
    assert.equal(escapeHtml("'world'"), '&#39;world&#39;');
    assert.equal(
      escapeHtml('<script>alert("XSS & CSRF")</script>'),
      '&lt;script&gt;alert(&quot;XSS &amp; CSRF&quot;)&lt;/script&gt;'
    );
  });

  await t.test('should not change safe strings', () => {
    assert.equal(escapeHtml('Hello World! 123'), 'Hello World! 123');
  });
});

test('sanitize - sanitizeUrl', async (t) => {
  await t.test('should return empty string for empty input', () => {
    assert.equal(sanitizeUrl(''), '');
    assert.equal(sanitizeUrl('   '), '');
    assert.equal(sanitizeUrl(null as unknown as string), '');
  });

  await t.test('should allow valid http and https URLs', () => {
    assert.equal(sanitizeUrl('https://example.com'), 'https://example.com/');
    assert.equal(sanitizeUrl('http://example.com/path'), 'http://example.com/path');
    assert.equal(sanitizeUrl('https://example.com?query=1&b=2'), 'https://example.com/?query=1&amp;b=2');
  });

  await t.test('should block javascript: URLs', () => {
    assert.equal(sanitizeUrl('javascript:alert(1)'), '');
    assert.equal(sanitizeUrl(' javascript:alert(1)'), '');
  });

  await t.test('should block data: URLs', () => {
    assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '');
  });

  await t.test('should allow relative paths', () => {
    assert.equal(sanitizeUrl('/path/to/resource'), '/path/to/resource');
    assert.equal(sanitizeUrl('./path'), './path');
    assert.equal(sanitizeUrl('../path'), '../path');
    assert.equal(sanitizeUrl('?query=1'), '?query=1');
    assert.equal(sanitizeUrl('#hash'), '#hash');
  });

  await t.test('should block invalid relative paths that do not start with safe prefixes', () => {
    assert.equal(sanitizeUrl('invalid/path'), '');
    assert.equal(sanitizeUrl('javascript:void(0)'), '');
  });
});

test('sanitize - escapeAttr', async (t) => {
  await t.test('should alias escapeHtml', () => {
    assert.equal(escapeAttr('<">'), '&lt;&quot;&gt;');
  });
});
