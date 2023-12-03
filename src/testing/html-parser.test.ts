import { parseHtml } from './html-parser.js';

describe('html-parser', () => {
  describe('parseHtml', () => {
    it('parses HTML', () => {
      const div = parseHtml(`<div>Hello, World!</div>`);

      expect(div).toBeInstanceOf(HTMLDivElement);
      expect(div.textContent).toBe('Hello, World!');
    });

    it('throws an error when given multiple root nodes', () => {
      expect(() => parseHtml(`<div></div><div></div>`)).toThrowError(
          /Expected parsed HTML to have exactly \*one\* root element/);
    });

    it('returns an HTML element owned by the current document', () => {
      const div = parseHtml(`<div>Hello, World!</div>`);

      expect(div.ownerDocument).toBe(document);
    });
  });
});
