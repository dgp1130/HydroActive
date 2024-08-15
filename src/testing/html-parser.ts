/** @fileoverview Defines utilities related to parsing HTML for testing. */

/**
 * Parses the given HTML text and returns the root element. The result is
 * asserted and typed as an instance of `resultComponent`. Any rendered custom
 * element classes *must* be included in either `resultComponent` or the
 * `dependencies` array. The `resultComponent` is implicitly considered a
 * dependency and does not need to be explicitly included in `dependencies`.
 *
 * @param resultComponent The component class of the top-level element in the
 *     HTML text. This is also used as the return type.
 * @param html The HTML text to parse.
 * @param dependencies Additional custom element classes used in the HTML text.
 * @returns The root element of the parsed input HTML, typed as
 *     an instance of `resultComponent`.
 *
 * @throws If multiple root elements are found. Only one root is allowed.
 * @throws If any rendered elements are custom elements and not included as the
 *     `resultComponent` or in the `dependencies` array.
 * @throws If the parsed root element is not an instance of `resultComponent`.
 */
export function parseHtml<Result extends typeof Element>(
  resultComponent: Result,
  html: string,
  dependencies: typeof Element[] = [],
): InstanceType<Result> {
  const deps = dependencies.concat(resultComponent);

  const doc = (Document as any).parseHTMLUnsafe(html); // TODO

  // Assert that exactly one root element is returned.
  const [ rootEl ] = doc.body.children;
  if (!rootEl || doc.body.children.length > 1) {
    throw new Error(
        `Expected parsed HTML to have exactly *one* root element:\n\n${html}`);
  }

  // `DOMParser` puts elements into a different document, so we need to adopt
  // them to the current document before they can be upgraded.
  const el = document.adoptNode(rootEl) as Element;

  // Parsed HTML might contain custom elements, upgrade it before returning.
  customElements.upgrade(el);

  // Assert all rendered custom elements have been defined and are dependencies.
  const undefinedTags = new Set(Array.from(walk(rootEl))
    .filter((el) => isCustomElement(el))
    .filter((el) => !deps.some((comp) => el instanceof comp))
    .map((el) => el.tagName.toLowerCase()));
  if (undefinedTags.size > 0) {
    throw new Error(`Parsed HTML without associated component definitions. Did you forget to add the component classes for the following tags as dependencies to \`parseHtml\`?:\n${
        Array.from(undefinedTags).join('\n')}`);
  }

  // Assert that the correct class is being returned in the top-level element.
  const expectedResultComp = resultComponent;
  const expectedComponentName = expectedResultComp.name;
  const actualComponentName = el.constructor.name;
  if (!(el instanceof expectedResultComp)) {
    throw new Error(`Expected parsed top-level element to be an instance of \`${
        expectedComponentName}\` but was actually an instance of \`${
        actualComponentName}\`.`);
  }

  return el as InstanceType<Result>;
}

// Walks the DOM hierarchy of all element descendants of the provided element.
function* walk(el: Element): Generator<Element, void, void> {
  yield el;
  for (const child of el.children) {
    yield* walk(child);
  }
}

function isCustomElement(el: Element): boolean {
  // Custom elements are *required* to have a `-` in their name.
  return el.tagName.includes('-');
}
