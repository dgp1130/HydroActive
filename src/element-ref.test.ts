import { ElementRef } from './element-ref.js';
import { parseHtml } from './testing/html-parser.js';

describe('element-ref', () => {
  describe('ElementRef', () => {
    describe('from', () => {
      it('constructs a new `ElementRef` from the given native element', () => {
        const el = ElementRef.from(document.createElement('div'));

        expect(el).toBeInstanceOf(ElementRef);

        // Verify that native element type is inferred from the input.
        () => {
          el.native satisfies HTMLDivElement;
        };
      });

      it('throws an error when given a non-Element type', () => {
        const textNode = document.createTextNode('Hello, World!');
        expect(() => ElementRef.from(textNode as unknown as Element))
            .toThrowError(/Tried to create an `ElementRef` of `nodeType` 3/);

        expect(() => ElementRef.from(document as unknown as Element))
            .toThrowError(/Tried to create an `ElementRef` of `nodeType` 9/);
      });

      it('rejects `Node` inputs at compile-time', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          // @ts-expect-error `Node` is not assignable to `Element`.
          ElementRef.from(document.createTextNode('Hello, World!'));
        };
      });
    });

    describe('native', () => {
      it('returns the native element given to the `ElementRef`', () => {
        const div = document.createElement('div');
        const el = ElementRef.from(div);

        expect(el.native).toBe(div);
      });

      it('should be readonly', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = ElementRef.from(document.createElement('div'));

          // @ts-expect-error `native` is `readonly`.
          el.native = document.createElement('div');
        };
      });
    });

    describe('text', () => {
      it('returns the `textContent` of the underlying element', () => {
        const el = ElementRef.from(parseHtml(`<div>Hello, World!</div>`));

        expect(el.text).toBe('Hello, World!');
      });

      it('throws an error when `textContent` is `null`', () => {
        // `textContent` is only `null` for `document` or a Doctype node,
        // which should be disallowed at construction time. So the only way to
        // simulate this is by overriding `textContent` directly.
        const div = document.createElement('div');
        spyOnProperty(div, 'textContent').and.returnValue(null);

        const el = ElementRef.from(div);
        expect(() => el.text).toThrowError(/`textContent` was `null`\./);
      });
    });

    describe('attr', () => {
      it('returns the attribute value for the given name', () => {
        const el = ElementRef.from(parseHtml(`<div foo="bar"></div>`));

        expect(el.attr('foo')).toBe('bar');
      });

      it('returns `null` when the attribute is not set', () => {
        const el = ElementRef.from(document.createElement('div'));

        expect(el.attr('foo')).toBeNull();
      });

      it('returns empty string when the attribute is set with no value', () => {
        const el = ElementRef.from(parseHtml(`<div foo bar=""></div>`));

        expect(el.attr('foo')).toBe('');
        expect(el.attr('bar')).toBe('');
      });
    });

    describe('query', () => {
      it('returns the queried element', () => {
        const el = ElementRef.from(
            parseHtml(`<div><span>Hello, World!</span></div>`));

        expect(el.query('span').text).toBe('Hello, World!');
      });

      it('throws an error when no element is found and not marked `optional`', () => {
        const el = ElementRef.from(document.createElement('div'));

        // Explicitly required.
        expect(() => el.query('span', { optional: false }))
            .toThrowError(/Selector "span" did not resolve to an element\./);

        // Implicitly required.
        expect(() => el.query('span', {}))
            .toThrowError(/Selector "span" did not resolve to an element\./);
        expect(() => el.query('span'))
            .toThrowError(/Selector "span" did not resolve to an element\./);
      });

      it('returns non-nullable type for required query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          // Explicitly required.
          {
            let result = el.query('span', { optional: false });

            // @ts-expect-error `null` should not be assignable to `result`.
            result = null;
          }

          // Implicitly required via default `optional`.
          {
            let result = el.query('span', {});

            // @ts-expect-error `null` should not be assignable to `result`.
            result = null;
          }

          // Implicitly required via default `options`.
          {
            let result = el.query('span');

            // @ts-expect-error `null` should not be assignable to `result`.
            result = null;
          }
        };
      });

      it('types the result based on a required query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          let _result1: ElementRef<HTMLInputElement> = el.query('input#id');
          let _result2: ElementRef<HTMLInputElement> = el.query('input#id', {});
          let _result3: ElementRef<HTMLInputElement> = el.query('input#id', {
            optional: false,
          });
        };
      });

      it('types the result as nullable based on an optional query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          let _result: ElementRef<HTMLInputElement> | null =
              el.query('input#id', { optional: true });
        };
      });

      it('types the result as nullable based on unknown optionality', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          let _result: ElementRef<HTMLInputElement> | null =
              el.query('input#id', { optional: true as boolean });
        };
      });

      it('types the result as `null` for impossible queries', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          let _result: null = el.query('input::before');
        };
      });

      it('returns `null` when no element is found and marked `optional`', () => {
        const el = ElementRef.from(document.createElement('div'));

        expect(el.query('span', { optional: true })).toBeNull();
      });

      it('returns nullable type for `optional` query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          // `ElementRef<Element> | null`
          let result = el.query('span', { optional: true });

          // `null` should be assignable to implicit return type.
          result = null;
        };
      });

      it('returns possibly nullable type for unknown optionality', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el: ElementRef<HTMLDivElement> = {} as any;

          // `ElementRef<Element> | null`
          let result = el.query('span', { optional: true as boolean });

          // `null` should be assignable to implicit return type.
          result = null;
        };
      });

      it('scopes to the native element', () => {
        const el = ElementRef.from(parseHtml(`
<div>
  <div>
    <!-- Should be skipped by \`:scope >\` -->
    <span>Descendant</span>
  </div>
  <span>Child</span>
</div>
        `.trim()));

        expect(el.query(':scope > span').text).toBe('Child');
      });
    });

    describe('queryAll', () => {
      it('returns the queried elements', () => {
        const el = ElementRef.from(parseHtml(`
<div>
  <span>Hello, World!</span>
  <span>Hello again!</span>
  <span>Hello once more!</span>
</div>
        `.trim()));

        expect(el.queryAll('span').map((el) => el.text)).toEqual([
          'Hello, World!',
          'Hello again!',
          'Hello once more!',
        ]);
      });

      it('throws an error when no element is found and not marked `optional`', () => {
        const el = ElementRef.from(document.createElement('div'));

        // Explicitly required.
        expect(() => el.queryAll('span', { optional: false }))
            .toThrowError(/Selector "span" did not resolve to any elements\./);

        // Implicitly required.
        expect(() => el.queryAll('span'))
            .toThrowError(/Selector "span" did not resolve to any elements\./);
        expect(() => el.queryAll('span', {}))
            .toThrowError(/Selector "span" did not resolve to any elements\./);
      });

      it('returns an empty array when no element is found and marked `optional`', () => {
        const el = ElementRef.from(document.createElement('div'));

        expect(el.queryAll('span', { optional: true })).toEqual([]);
      });

      it('returns a *real* array', () => {
        const el = ElementRef.from(document.createElement('div'));

        expect(el.queryAll('span', { optional: true })).toBeInstanceOf(Array);
      });

      it('scopes to the native element', () => {
        const el = ElementRef.from(parseHtml(`
<div>
  <div>
    <!-- Should be skipped by \`:scope >\` -->
    <span>Descendant</span>
  </div>
  <span>Child 1</span>
  <span>Child 2</span>
</div>
        `.trim()));

        expect(el.queryAll(':scope > span').map((el) => el.text)).toEqual([
          'Child 1',
          'Child 2',
        ]);
      });

      it('types the result based on query', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementRef<HTMLDivElement>;

          const _result: ElementRef<HTMLInputElement>[] = el.queryAll('input');
        };
      });

      it('type the result without `null` pollution', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as ElementRef<HTMLDivElement>;

          // `Array<ElementRef<Element>>` because pseudo-selectors always
          // resolve to `null`. At runtime, this will always be an empty `[]`,
          // so we type this as `Array<ElementRef<Element>>`.
          const result = el.queryAll('input::before');

          // @ts-expect-error `result` contains an array of `Element`, not an
          // array of `HTMLInputElement`.
          const _inputs: ElementRef<HTMLInputElement>[] = result;
        };
      });
    });
  });
});
