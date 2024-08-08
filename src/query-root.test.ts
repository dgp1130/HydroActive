import { QueryRoot } from './query-root.js';
import { parseHtml } from './testing.js';
import { NoopComponent } from './testing/noop-component.js';

describe('query-root', () => {
  describe('QueryRoot', () => {
    describe('from', () => {
      it('creates a `QueryRoot` from the given element', () => {
        const el = document.createElement('div');

        expect(QueryRoot.from(el).root).toBe(el);
      });
    });

    describe('query', () => {
      it('returns the first queried element', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>First</span>
            <span>Second</span>
          </div>
        `);

        expect(QueryRoot.from(el).query('span').unvalidatedElement.textContent)
            .toBe('First');
      });

      it('throws when no element is found by default', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(() => QueryRoot.from(el).query('input'))
            .toThrowError(/did not resolve to an element/);
      });

      it('returns `null` when no element is found and explicitly `optional`', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(QueryRoot.from(el).query('input', { optional: true }))
            .toBeNull();
      });

      it('throws when no element is found and explicitly not `optional`', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(() => QueryRoot.from(el).query('input', { optional: false }))
            .toThrowError(/did not resolve to an element/);
      });

      it('throws an error suggesting `.shadow` when the queried element is missing, but found in the open shadow DOM', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <template shadowrootmode="open">
              <span>Element</span>
            </template>
          </div>
        `);

        expect(() => QueryRoot.from(el).query('span'))
            .toThrowError(/Did you mean to call `\.shadow\.query\(\.\.\.\)`/);
      });

      it('throws an error suggesting `.shadow` when the queried element is missing, but found in the closed shadow DOM', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <template shadowrootmode="closed">
              <span>Element</span>
            </template>
          </noop-component>
        `);

        const root = QueryRoot.from(el, () => el._elementInternals.shadowRoot);
        expect(() => root.query('span'))
            .toThrowError(/Did you mean to call `\.shadow\.query\(\.\.\.\)`/);
      });

      it('throws when given an element and shadow root which are not associated', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span></span>
            <span>
              <template shadowrootmode="open"></template>
            </span>
          </div>
        `,);

        const [ span1, span2 ] = el.children;

        const root = QueryRoot.from(span1!, () => span2!.shadowRoot!);
        expect(() => root.query('not-a-match'))
            .toThrowError(/does not belong to the associated element/);
      });
    });

    describe('queryAll', () => {
      it('returns the first queried element', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>First</span>
            <span>Second</span>
            <span>Third</span>
          </div>
        `);

        const items = QueryRoot.from(el).queryAll('span')
            .map((span) => span.unvalidatedElement.textContent);
        expect(items).toEqual([ 'First', 'Second', 'Third' ]);
      });

      it('throws when no element is found by default', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(() => QueryRoot.from(el).queryAll('input'))
            .toThrowError(/did not resolve to any elements/);
      });

      it('returns empty list when no element is found and explicitly `optional`', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(QueryRoot.from(el).queryAll('input', { optional: true }))
            .toEqual([]);
      });

      it('throws when no element is found and explicitly not `optional`', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(() => QueryRoot.from(el).queryAll('input', { optional: false }))
            .toThrowError(/did not resolve to any elements/);
      });

      it('throws an error suggesting `.shadow` when the queried elements are missing, but found in the open shadow DOM', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <template shadowrootmode="open">
              <span>First</span>
              <span>Second</span>
              <span>Third</span>
            </template>
          </div>
        `);

        expect(() => QueryRoot.from(el).queryAll('span')).toThrowError(
            /Did you mean to call `\.shadow\.queryAll\(\.\.\.\)`/);
      });

      it('throws an error suggesting `.shadow` when the queried element is missing, but found in the closed shadow DOM', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <template shadowrootmode="closed">
              <span>Element</span>
            </template>
          </noop-component>
        `);

        const root = QueryRoot.from(el, () => el._elementInternals.shadowRoot);
        expect(() => root.queryAll('span')).toThrowError(
            /Did you mean to call `\.shadow\.queryAll\(\.\.\.\)`/);
      });

      it('throws when given an element and shadow root which are not associated', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span></span>
            <span>
              <template shadowrootmode="open"></template>
            </span>
          </div>
        `,);

        const [ span1, span2 ] = el.children;

        const root = QueryRoot.from(span1!, () => span2!.shadowRoot!);
        expect(() => root.queryAll('not-a-match'))
            .toThrowError(/does not belong to the associated element/);
      });
    });

    describe('shadow', () => {
      it('returns the open shadow root of the given element', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <template shadowrootmode="open"></template>
          </div>
        `);

        expect(QueryRoot.from(el).shadow.root).toBe(el.shadowRoot!);
      });

      it('returns the closed shadow root of the given element when provided', () => {
        const el = parseHtml(NoopComponent, `
          <noop-component>
            <template shadowrootmode="closed"></template>
          </noop-component>
        `);

        const root = QueryRoot.from(el, () => el._elementInternals.shadowRoot);
        expect(root.shadow.root).toBe(el._elementInternals.shadowRoot!);
      });

      it('throws an error the input does not have a shadow root', () => {
        const el = parseHtml(HTMLDivElement, `<div></div>`);

        expect(() => QueryRoot.from(el).shadow)
            .toThrowError(/does not have a shadow root/);
      });

      it('throws an error the input has an inaccessible closed shadow root', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <template shadowrootmode="closed"></template>
          </div>
        `);

        expect(() => QueryRoot.from(el).shadow)
            .toThrowError(/shadow root is closed/);
      });

      it('throws an error when called multiple times', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <template shadowrootmode="open"></template>
          </div>
        `);

        const root = QueryRoot.from(el);
        const firstShadow = root.shadow;
        expect(() => firstShadow.shadow)
            .toThrowError(/already scoped to its shadow root/);
      });
    });
  });
});
