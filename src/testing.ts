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

// Simplified typing of Mocha `it()` function. Many test frameworks look like this but have
// subtle differences, Jasmine for example has a timeout parameter. This provides a "good
// enough" type while not being overly restrictive and removes a dependency on `@types/mocha`.
declare function it(expectation: string, assertion: () => void | Promise<void>, ...rest: unknown[]): void;
