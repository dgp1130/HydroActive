import { type QueriedElement } from './query.js';

describe('query', () => {
  describe('QueriedElement', () => {
    typeTest('resolves a basic tag name element', () => {
      // We pick `HTMLInputElement` because it has some unique properties not
      // included in other elements. If we used `div` and `span`, they may
      // inadvertently pass some tests just because they happen to be assignable
      // to each other.
      const _el: HTMLInputElement = {} as QueriedElement<'input'>;
    });

    typeTest('resolves tag name of a custom element', () => {
      const _el: TypedElement = {} as QueriedElement<'typed-element'>;
    });

    typeTest('resolves wildcard selector', () => {
      // `Element` has a lot of subclasses, so we *don't* want that on the `_el`
      // definition or else a misbehaving `QueriedElement` might still
      // inadvertently pass the test if the result happens to extend `Element`.
      const _el: QueriedElement<'*'> = {} as Element;
    });

    typeTest('resolves `:scope` to the host element', () => {
      const _el: HTMLInputElement =
          {} as QueriedElement<':scope', HTMLInputElement>;
    });

    typeTest('resolves `:scope` to `Element` by default', () => {
      const _el: QueriedElement<':scope'> = {} as Element;
    });

    typeTest('resolve `:scope` to `Element` for `ShadowRoot`', () => {
      const _el: QueriedElement<':scope', ShadowRoot> = {} as Element;
    });

    typeTest('resolves a tag name with class', () => {
      const _el: HTMLInputElement = {} as QueriedElement<'input.clazz'>;
    });

    typeTest('resolves a tag name with ID', () => {
      const _el: HTMLInputElement = {} as QueriedElement<'input#id'>;
    });

    typeTest('resolves a tag name with attribute', () => {
      // Has attribute.
      const _el1: HTMLInputElement = {} as QueriedElement<'input[attr]'>;
      const _el2: HTMLInputElement = {} as QueriedElement<'input[  attr  ]'>;

      // Has attribute with value, no spaces.
      const _el3: HTMLInputElement = {} as QueriedElement<'input[attr=value]'>;
      const _el4: HTMLInputElement =
          {} as QueriedElement<'input[attr="value"]'>;
      const _el5: HTMLInputElement =
          {} as QueriedElement<'input[attr=\'value\']'>;

      // Has attribute with value, wrapped in spaces.
      const _el6: HTMLInputElement =
          {} as QueriedElement<'input[  attr=value  ]'>;
      const _el7: HTMLInputElement =
          {} as QueriedElement<'input[  attr="value"  ]'>;
      const _el8: HTMLInputElement =
          {} as QueriedElement<'input[  attr=\'value\'  ]'>;

      // Has attribute with value, equals wrapped in spaces.
      const _el9: HTMLInputElement =
          {} as QueriedElement<'input[attr  =  value]'>;
      const _el10: HTMLInputElement =
          {} as QueriedElement<'input[attr  =  "value"]'>;
      const _el11: HTMLInputElement =
          {} as QueriedElement<'input[attr  =  \'value\']'>;

      // Has attribute with value, both equals and attribute wrapped in spaces.
      const _el12: HTMLInputElement =
          {} as QueriedElement<'input[  attr  =  value  ]'>;
      const _el13: HTMLInputElement =
          {} as QueriedElement<'input[  attr  =  \'value\'  ]'>;
      const _el14: HTMLInputElement =
          {} as QueriedElement<'input[  attr  =  \'value\'  ]'>;
    });

    typeTest('resolves a tag name with a pseudo-class', () => {
      const _el: HTMLInputElement = {} as QueriedElement<'input:hover'>;
    });

    typeTest('resolves a tag name with pseudo-element to null', () => {
      const _el: null = null as QueriedElement<'input::before'>;
    });

    typeTest('resolves a tag name in a descendent combinator', () => {
      const _el: HTMLInputElement = {} as QueriedElement<'div input'>;
    });

    typeTest('resolves a tag name in a child combinator', () => {
      const _el1: HTMLInputElement = {} as QueriedElement<'div > input'>;
      const _el2: HTMLInputElement = {} as QueriedElement<'div>input'>;
    });

    typeTest('resolves a tag name in a general sibling combinator', () => {
      const _el1: HTMLInputElement = {} as QueriedElement<'div ~ input'>;
      const _el2: HTMLInputElement = {} as QueriedElement<'div~input'>;
    });

    typeTest('resolves a tag name in an adjacent sibling combinator', () => {
      const _el1: HTMLInputElement = {} as QueriedElement<'div + input'>;
      const _el2: HTMLInputElement = {} as QueriedElement<'div+input'>;
    });

    typeTest('resolves a tag name in a column combinator', () => {
      const _el1: HTMLInputElement = {} as QueriedElement<'div || input'>;
      const _el2: HTMLInputElement = {} as QueriedElement<'div||input'>;
    });

    typeTest('resolves tag names in a selector list', () => {
      const _el1: HTMLInputElement | HTMLSelectElement =
          {} as QueriedElement<'input, select'>;
      const _el2: HTMLInputElement | HTMLSelectElement =
          {} as QueriedElement<'input,select'>;
    });

    typeTest('resolves queries without a tag name to `Element`', () => {
      const _el: QueriedElement<'.foo'> = {} as Element;
    });

    typeTest('resolves queries from a `ShadowRoot`', () => {
      const _el: QueriedElement<'input', ShadowRoot> = {} as HTMLInputElement;
    });
  });
});

// Custom element definition to test against.
class TypedElement extends HTMLElement {}
customElements.define('typed-element', TypedElement);
declare global {
  interface HTMLElementTagNameMap {
    'typed-element': TypedElement;
  }
}

function typeTest(desc: string, _callback: () => void): void {
  it(desc, () => {
    // Don't actually run the test, only needs to compile, not execute.
    expect().nothing();
  });
}
