import { GetProps } from './functional.js';

/**
 * Hydrates the given element by assigning all the given properties and then removing the
 * `defer-hydration` attribute.
 * 
 * Asserts that `defer-hydration` is present prior to removing it to ensure the element was
 * not previously hydrated.
 * Also asserts that the given element is actually an instance of the provided class.
 */
export function hydrate<Clazz extends Class<Element>>(el: Element, clazz: Clazz,
  // `props` can be omitted if the element does not have any required properties.
  ...[ props = {} as any ]: (
    {} extends GetProps<Clazz>
      ? [ props?: GetProps<Clazz> ]
      : [ props: GetProps<Clazz> ]
  )
): asserts el is InstanceType<Clazz> {
  // Assert that the element was properly deferred, or else it will hydrate before the test
  // has a chance to run.
  if (!el.hasAttribute('defer-hydration')) {
    throw new Error(`Expected element to be deferred, but it was already hydrated. Did you forget \`defer-hydration\`?`);
  }

  // Assert class instance to make sure we were given the right class for this element.
  // This is not very useful itself, however it requires that the user imports the component's
  // class, meaning it is very likely (though notably not guaranteed) to to be defined.
  if (!(el instanceof clazz)) {
    throw new Error(`Expected element to be an instance of \`${
      clazz.name}\`, but got an instance of \`${(el as Element).constructor.name}\` instead.`);
  }

  // Assign all the provided props values.
  for (const [ key, value ] of Object.entries(props)) {
    (el as any)[key] = value;
  }

  // Hydrate the element.
  el.removeAttribute('defer-hydration');
}

// Simplified typing of Mocha `it()` function. Many test frameworks look like this but have
// subtle differences, Jasmine for example has a timeout parameter. This provides a "good
// enough" type while not being overly restrictive and removes a dependency on `@types/mocha`.
declare function it(expectation: string, assertion: () => void | Promise<void>, ...rest: unknown[]): void;

/**
 * HydroActive `it` test. A wrapper of the Mocha `it()` function which provides a prerendered
 * test case and cleans up the DOM afterwards.
 * 
 * @param selector The selector of the DOM element holding the prerendered content for this
 *     test case. Must be unique on the page.
 * @param expectation Description of the test (the first parameter of the underlying `it()`).
 * @param assertion The callback implementing the test. Accepts the element matching
 *     @param selector to validate. Note that the element is *not* hydrated yet and should be
 *     treated as an `Element`, not its specific class.
 * @param timeout The timeout to run the test under.
 */
export function hit(
  selector: string,
  expectation: string,
  assertion: (el: Element) => void | Promise<void>,
  ...rest: unknown[]
): void {
  it(`\`${selector}\` ${expectation}`, () => {
    const el = query(selector);
    function cleanup(): void {
      el.remove();
    }

    let result: void | Promise<void>
    try {
      result = assertion(el as any);
    } finally {
      if (result instanceof Promise) {
        result = result.finally(() => void cleanup());
      } else {
        cleanup();
      }
    }

    return result;
  }, ...rest);
}

/**
 * Queries for an element with the given selector in the document and asserts a single result
 * was found. Returns a `Dehydrated` `Element` instance which can be hydrated to its intended
 * type.
 */
function query(selector: string): Element {
  const [ el, ...rest ] = document.querySelectorAll(selector);
  if (!el) throw new Error(`No element matched selector \`${selector}\`.`);
  if (rest.length !== 0) throw new Error(`Multiple elements matched selector \`${selector}\`, expected only one.`);

  return el;
}

type Class<T> = new (...args: unknown[]) => T;
