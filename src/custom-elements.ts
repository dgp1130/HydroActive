/** @fileoverview Defines utilities for interacting with custom elements. */

/**
 * Returns whether or not the given element is a custom element. The custom
 * element may or may not be defined.
 *
 * @param el The {@link Element} to check.
 * @returns Whether or not `el` is a custom element.
 */
export function isCustomElement(el: Element): boolean {
  return el.tagName.includes('-');
}

/**
 * Returns whether or not the given custom element has been defined and
 * upgraded.
 *
 * Note that "defining" and "upgrading" an element are two separate things which
 * can happen at separate times. Typically, defining an element upgrades all
 * existing elements on the page, and constructing a new element immediately
 * defines it. However there are edge cases where an element is defined but
 * certain instances may not be upgraded. For example, custom elements created
 * in background documents are not upgraded until they are adopted into the
 * primary document, even if the element was already defined.
 *
 * @param el The {@link Element} to check.
 * @returns Whether or not `el` has been defined.
 * @throws When the given element is not a custom element.
 */
export function isUpgraded(el: Element): boolean {
  if (!isCustomElement(el)) {
    throw new Error(`\`${el.tagName.toLowerCase()}\` is not a custom element.`);
  }

  const CeClass = customElements.get(el.tagName.toLowerCase());
  if (!CeClass) return false;

  return el instanceof CeClass;
}
