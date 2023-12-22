import { parseHtml } from './html-parser.js';
import { NoopComponent } from './noop-component.js';

describe('html-parser', () => {
  describe('parseHtml', () => {
    it('parses HTML', () => {
      const div = parseHtml(HTMLDivElement, `<div>Hello, World!</div>`);

      expect(div).toBeInstanceOf(HTMLDivElement);
      expect(div.textContent).toBe('Hello, World!');
    });

    it('parses HTML with provided custom elements', () => {
      const div = parseHtml(HTMLDivElement, `
        <div>
          <noop-component></noop-component>
        </div>
      `, [ NoopComponent ]);

      expect(div.querySelector('noop-component')).toBeInstanceOf(NoopComponent);
    });

    it('returns an instance of the result element provided', () => {
      const comp = parseHtml(NoopComponent, `
        <noop-component></noop-component>
      `);

      expect(comp).toBeInstanceOf(NoopComponent);
    });

    it('return type is an instance of the result element provided', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        let comp: NoopComponent = parseHtml(NoopComponent, `
          <noop-component></noop-component>
        `);
      };
    });

    it('throws an error when given multiple root nodes', () => {
      expect(() => parseHtml(HTMLDivElement, `<div></div><div></div>`))
          .toThrowError(/Expected parsed HTML to have exactly \*one\* root element/);
    });

    it('throws an error when missing component definitions', () => {
      expect(() => parseHtml(HTMLDivElement, `
        <div>
          <comp-1></comp-1>
          <comp-2></comp-2>
        </div>
      `)).toThrowError(/Did you forget to add the component classes.*comp-1.*comp-2/s);
    });

    it('throws an error of only the missing component definitions', () => {
      const err = extractError(() => parseHtml(HTMLDivElement, `
        <div>
          <noop-component></noop-component>
          <missing-component></missing-component>
        </div>
      `, [ NoopComponent ]));

      expect(err.message).toContain('missing-component');
      expect(err.message).not.toContain('noop-component');
    });

    it('throws an error when given the wrong top-level element', () => {
      expect(() => parseHtml(HTMLDivElement, `
        <noop-component></noop-component>
      `, [ NoopComponent ]))
          .toThrowError(/Expected parsed top-level element to be an instance of.*HTMLDivElement.*NoopComponent/);
    });

    it('throws an error when given the wrong top-level *custom* element', () => {
      expect(() => parseHtml(NoopComponent, `<div></div>`))
          .toThrowError(/Expected parsed top-level element to be an instance of.*NoopComponent.*HTMLDivElement/);
    });

    it('returns an HTML element owned by the current document', () => {
      const div = parseHtml(HTMLDivElement, `<div>Hello, World!</div>`);

      expect(div.ownerDocument).toBe(document);
    });

    it('evaluates declarative shadow DOM', () => {
      const div = parseHtml(HTMLDivElement, `
        <div>
          <template shadowrootmode="open">
            <span></span>
          </template>
        </div>
      `);

      expect(div.children.length).toBe(0);
      expect(div.shadowRoot!.children.length).toBe(1);
      expect(div.shadowRoot!.children[0]!).toBeInstanceOf(HTMLSpanElement);
    });
  });
});

/** Catches an error thrown in the given callback and returns it. */
function extractError(callback: () => void): Error {
  try {
    callback();
  } catch (err) {
    return err as Error;
  }

  throw new Error(`Expected callback to throw but it did not.`);
}
