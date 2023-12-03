/** @fileoverview Defines utilities related to parsing HTML for testing. */

// Add the `includeShadowRoots` option to `DOMParser.prototype.parseFromString`.
type ParseFromString = (html: string, type: DOMParserSupportedType, options?: {
  includeShadowRoots?: boolean,
}) => Document;
const parseFromString = DOMParser.prototype.parseFromString as ParseFromString;

/**
 * Parses the given HTML text and returns the root element. Throws an error if
 * multiple root elements are found.
 *
 * @param html The HTML text to parse.
 * @returns The root {@link Element} object of the parsed input HTML.
 */
export function parseHtml(html: string): Element {
  const doc = parseFromString.call(new DOMParser(), html, 'text/html', {
    includeShadowRoots: true,
  });

  const [ rootEl ] = doc.body.children;
  if (!rootEl || doc.body.children.length > 1) {
    throw new Error(
        `Expected parsed HTML to have exactly *one* root element:\n\n${html}`);
  }

  return document.adoptNode(rootEl) as Element;
}
