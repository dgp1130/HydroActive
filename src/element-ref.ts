/**
 * @fileoverview Defines the {@link ElementRef} class and associated utilities.
 */

/**
 * A wrapper class of {@link Element} which provides more ergonomic API access
 * conducive to chaining.
 */
export class ElementRef<El extends Element> {
  private constructor(public readonly native: El) {}

  /**
   * Creates a new {@link ElementRef} from the given {@link Element} object.
   *
   * @param native The native element to wrap in an {@link ElementRef}.
   * @returns A new {@link ElementRef} object wrapping the input.
   */
  public static from<El extends Element>(native: El): ElementRef<El> {
    if (native.nodeType !== Node.ELEMENT_NODE) {
      throw new Error(`Tried to create an \`ElementRef\` of \`nodeType\` ${
        native.nodeType} (see https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType).\n\n\`ElementRef\` must be created with an \`Element\`, not any other type of \`Node\`.`);
    }

    return new ElementRef(native);
  }

  /**
   * Provides the {@link Element.prototype.textContent} value of the underlying
   * element, asserted to be non-null.
   *
   * @returns The text content of the underlying element.
   */
  public get text(): string {
    const text = this.native.textContent;

    // This should only happen when the native element is a `Document` or a
    // DocType. Neither should be allowed to be constructed, but even if so, we
    // assert here to be sure.
    if (text === null) {
      throw new Error('`textContent` was `null`.');
    }

    return text;
  }

  /**
   * Provides the value of the attribute with the given name on the underlying
   * element.
   *
   * Note that an attribute without a value such as `<div foo></div>` will
   * return an empty string which is considered falsy. The correct way to check
   * if an attribute exists is: `attr('foo') !== null`.
   *
   * @param name The name of the attribute to read.
   * @returns The value of the attribute, or `null` if not set.
   */
  public attr(name: string): string | null {
    return this.native.getAttribute(name);
  }
}
