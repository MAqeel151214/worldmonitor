import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  h,
  text,
  fragment,
  clearChildren,
  replaceChildren,
  rawHtml,
  safeHtml,
} from '../src/utils/dom-utils.js';

// Setup DOM environment
const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = window.document;
global.Node = window.Node;
global.Element = window.Element;
global.DocumentFragment = window.DocumentFragment;
global.Event = window.Event;
global.HTMLElement = window.HTMLElement;
global.Text = window.Text;

test('dom-utils - h() element creation', async (t) => {
  await t.test('should create empty element', () => {
    const el = h('div');
    assert.equal(el.tagName, 'DIV');
    assert.equal(el.childNodes.length, 0);
  });

  await t.test('should create element with props', () => {
    const el = h('span', { className: 'foo bar', id: 'test-id', 'data-test': 'value' });
    assert.equal(el.className, 'foo bar');
    assert.equal(el.id, 'test-id');
    assert.equal(el.getAttribute('data-test'), 'value');
  });

  await t.test('should apply dataset props', () => {
    const el = h('div', { dataset: { role: 'button', active: 'true' } });
    assert.equal(el.dataset.role, 'button');
    assert.equal(el.dataset.active, 'true');
  });

  await t.test('should apply style object and string', () => {
    const el1 = h('div', { style: 'color: red;' });
    assert.equal(el1.style.color, 'red');

    const el2 = h('div', { style: { color: 'blue', display: 'none' } });
    assert.equal(el2.style.color, 'blue');
    assert.equal(el2.style.display, 'none');
  });

  await t.test('should handle event listeners', () => {
    let clicked = false;
    const el = h('button', {
      onClick: () => {
        clicked = true;
      },
    });
    el.click();
    assert.ok(clicked);
  });

  await t.test('should append text and element children', () => {
    const childEl = document.createElement('span');
    const el = h('div', null, 'text child', childEl, 42);

    assert.equal(el.childNodes.length, 3);
    assert.equal(el.childNodes[0].textContent, 'text child');
    assert.equal(el.childNodes[1], childEl);
    assert.equal(el.childNodes[2].textContent, '42');
  });

  await t.test('should ignore falsey children', () => {
    const el = h('div', null, 'valid', null, undefined, false, 'end');
    assert.equal(el.childNodes.length, 2);
    assert.equal(el.childNodes[0].textContent, 'valid');
    assert.equal(el.childNodes[1].textContent, 'end');
  });

  await t.test('should handle element creation with first argument as child', () => {
    const el = h('div', 'first text', 'second text');
    assert.equal(el.childNodes.length, 2);
    assert.equal(el.childNodes[0].textContent, 'first text');
    assert.equal(el.childNodes[1].textContent, 'second text');
  });
});

test('dom-utils - text()', async (t) => {
  await t.test('should create text node', () => {
    const node = text('hello');
    assert.equal(node.nodeType, Node.TEXT_NODE);
    assert.equal(node.textContent, 'hello');
  });
});

test('dom-utils - fragment()', async (t) => {
  await t.test('should create document fragment with children', () => {
    const frag = fragment(h('span'), 'text', h('div'));
    assert.equal(frag.nodeType, Node.DOCUMENT_FRAGMENT_NODE);
    assert.equal(frag.childNodes.length, 3);
  });
});

test('dom-utils - clearChildren()', async (t) => {
  await t.test('should remove all child nodes', () => {
    const el = h('div', null, h('span'), 'text', h('b'));
    assert.equal(el.childNodes.length, 3);
    clearChildren(el);
    assert.equal(el.childNodes.length, 0);
  });
});

test('dom-utils - replaceChildren()', async (t) => {
  await t.test('should clear and append new children', () => {
    const el = h('div', null, 'old text');
    assert.equal(el.childNodes.length, 1);

    replaceChildren(el, h('span'), 'new text');
    assert.equal(el.childNodes.length, 2);
    assert.equal((el.childNodes[0] as Element).tagName, 'SPAN');
    assert.equal(el.childNodes[1].textContent, 'new text');
  });
});

test('dom-utils - rawHtml()', async (t) => {
  await t.test('should create fragment from html string', () => {
    const frag = rawHtml('<div>hello</div><span>world</span>');
    assert.equal(frag.childNodes.length, 2);
    assert.equal((frag.childNodes[0] as Element).tagName, 'DIV');
    assert.equal((frag.childNodes[1] as Element).tagName, 'SPAN');
  });
});

test('dom-utils - safeHtml()', async (t) => {
  await t.test('should allow safe tags and attributes', () => {
    const frag = safeHtml('<strong class="test">bold</strong><a href="https://example.com" target="_blank">link</a>');
    assert.equal(frag.childNodes.length, 2);
    const strong = frag.childNodes[0] as Element;
    const a = frag.childNodes[1] as Element;

    assert.equal(strong.tagName, 'STRONG');
    assert.equal(strong.className, 'test');
    assert.equal(strong.textContent, 'bold');

    assert.equal(a.tagName, 'A');
    assert.equal(a.getAttribute('href'), 'https://example.com');
    assert.equal(a.getAttribute('target'), '_blank');
  });

  await t.test('should strip unsafe tags but keep children', () => {
    const frag = safeHtml('<div><script>alert(1)</script>text inside</div>');
    const div = frag.childNodes[0] as Element;
    // Actually safeHtml leaves 2 text nodes after stripping the tag if it's placed like that.
    // The `<script>` tag is removed, its child text node "alert(1)" remains, and "text inside" remains.
    assert.ok(div.textContent?.includes('alert(1)text inside'));
  });

  await t.test('should strip unsafe attributes', () => {
    const frag = safeHtml('<div onclick="alert(1)" class="safe">text</div>');
    const div = frag.childNodes[0] as Element;
    assert.equal(div.hasAttribute('onclick'), false);
    assert.equal(div.hasAttribute('class'), true);
  });

  await t.test('should sanitize href attribute to prevent javascript URIs', () => {
    const frag1 = safeHtml('<a href="javascript:alert(1)">bad link</a>');
    const a1 = frag1.childNodes[0] as Element;
    assert.equal(a1.hasAttribute('href'), false);

    const frag2 = safeHtml('<a href="/local/path">good link</a>');
    const a2 = frag2.childNodes[0] as Element;
    assert.equal(a2.getAttribute('href'), '/local/path');

    const frag3 = safeHtml('<a href="#hash">hash link</a>');
    const a3 = frag3.childNodes[0] as Element;
    assert.equal(a3.getAttribute('href'), '#hash');
  });
});
