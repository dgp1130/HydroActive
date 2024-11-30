/**
 * @fileoverview Provides utilities around hydration and the `defer-hydration`
 * community protocol.
 *
 * https://github.com/webcomponents-cg/community-protocols/pull/15/
 */

import { isCustomElement, isUpgraded } from './custom-elements.js';

/**
 * Returns whether or not the given element has been hydrated.
 *
 * @param el The {@link Element} to check.
 * @returns Whether the {@link Element} has already been hydrated.
 */
export function isHydrated(el: Element): boolean {
  // Custom elements must be upgraded to hydrate.
  if (isCustomElement(el) && !isUpgraded(el)) return false;

  // Any element not deferred has hydrated. This makes two possibly-wrong
  // assumptions:
  // 1.  An element could be hydrated and then have `defer-hydration` added
  //     afterwards.
  // 2.  An element could be programmatically constructed and hydrate in its
  //     constructor call, prior to `defer-hydration` being initially set.
  //
  // We can't detect either of these cases, so all we can do is ignore them.
  // See: https://github.com/webcomponents-cg/community-protocols/issues/38#issuecomment-1962826866
  return !el.hasAttribute('defer-hydration');
}

/**
 * Hydrates the given element. Throws if it has already been hydrated or cannot
 * be hydrated because it belongs to a custom element whose definition has not
 * loaded yet.
 *
 * The element class is only used to assert that a valid super class is given,
 * nothing useful is actually done with it. The reason for its requirement is to
 * ensure that the hydrated class is actually defined and upgraded prior to
 * hydration. This could happen by accident, a bundler could coincidentally put
 * any file in any order for any reason, but having an explicit dependency on
 * the hydrated class ensures it is included in the bundle, evaluates, and
 * defines custom elements before it is hydrated.
 *
 * @param el The {@link Element} to hydrate.
 * @param elementClass The class of the element to hydrate. This helps ensure
 *     that the custom element has been evaluated and defined.
 * @param props Properties to assign to the element during hydration.
 * @throws If the element does not extend the provided class.
 * @throws If the element is a custom element, but not upgraded.
 * @throws If the element is already hydrated.
 */
export function hydrate<ElClass extends typeof Element>(
  el: Element,
  elementClass: ElClass,
  ...[ props ]: {} extends PropsOf<InstanceType<ElClass>>
    ? [ props?: PropsOf<InstanceType<ElClass>> ]
    : [ props: PropsOf<InstanceType<ElClass>> ]
): asserts el is InstanceType<ElClass> {
  // Validate that we were given the right class. If it is a custom element and
  // has not yet been defined or upgraded, this check will likely fail and
  // provide a better error message, so we check it first.
  if (!(el instanceof elementClass)) {
    throw new Error(`\`<${
        (el as Element).tagName.toLowerCase()}>\` element did not extend provided class \`${
        elementClass.name}\`. Did you mean to pass \`${
        (el as {}).constructor.name}\` or a different class definition?`);
  }

  if (isCustomElement(el) && !isUpgraded(el)) {
    throw new Error(`
\`<${el.tagName.toLowerCase()}>\` element is not upgraded, this can happen for a few reasons.

1. You may have passed a super class like \`Element\` or \`HTMLElement\` as the class definition, which does not ensure that the class is defined. Passing the correct class can help ensure it is defined prior to hydration.
2. You might not have called \`customElements.define\` on the class prior to hydration. Did you forget that line, or does custom element definition happen separately from its class definition?
3. Do you need to call \`customElements.upgrade\` on the element? In extremely rare cases, elements from other documents may not be upgraded, even though the class is defined. Adopting the node into the main document with \`document.adoptNode\` and then upgrading it directly with \`customElements.upgrade\` may be required.
    `.trim());
  }

  // Validate that the element is not already hydrated.
  if (!el.hasAttribute('defer-hydration')) {
    throw new Error(`\`<${
        (el.tagName.toLowerCase())}>\` was already hydrated and cannot be hydrated again.`);
  }

  // Assign any properties prior to triggering hydration.
  if (props) {
    for (const [ prop, value ] of Object.entries(props)) {
      (el as any)[prop] = value;
    }
  }

  // Trigger hydration. Most components will observe this removal synchronously
  // in `attributeChangedCallback`, though some code may observe asynchronously
  // through `MutationObserver` or polling.
  el.removeAttribute('defer-hydration');
}

/**
 * Returns the hydration properties of the given element based on a lookup of
 * the tag name in {@link HTMLElementHydrationParamsMap}. If the given element
 * is not in the map, then *all* of its properties are considered optional
 * hydration parameters.
 *
 * NOTE: The provided element must have a `tagName` property of a specific
 * string literal. By default, custom elements have `tagName: string` which is
 * not sufficient to perform this lookup in the global map. Elements should
 * have:
 *
 * ```typescript
 * class MyElement extends HTMLElement {
 *   declare tagName: 'MY-ELEMENT'; // Necessary for `PropsOf`.
 * }
 *
 * customElements.define('my-element', MyElement);
 * ```
 */
export type PropsOf<El extends Element> =
  Lowercase<El['tagName']> extends keyof HTMLElementHydrationParamsMap
    ? HTMLElementHydrationParamsMap[Lowercase<El['tagName']>]
    : { [Key in keyof El]?: El[Key] }
;

/**
 * Extracts the listed required and optional properties to be set during
 * hydration. Optional properties may be omitted while required properties
 * *must* be provided during hydration.
 *
 * @param El The {@link Element} which contains the following properties.
 * @param Props The required and optional properties which exist on {@link El}
 *     to provide during hydration.
 * @returns A {@link HydrationParams} type listing out the allowed properties
 *     and their specific types.
 */
export type Properties<
  El extends Element,
  Props extends {
    required?: keyof El,
    optional?: keyof El,
  },
> = (
  'required' extends keyof Props
    ? Props['required'] extends keyof El
      ? {[Prop in Props['required']]: El[Prop]}
      : never
    : {}
) & (
  'optional' extends keyof Props
    ? Props['optional'] extends keyof El
      ? {[Prop in Props['optional']]?: El[Prop]}
      : never
    : {}
);

/**
 * Specifies parameters which can be set on an element during hydration. This
 * object is typically created via {@link Properties} and selecting specific
 * properties of an existing element type.
 */
export type HydrationParams = Record<string | number | symbol, unknown>;

declare global {
  /**
   * A map of HTML element tag names to a {@link HydrationParams} object
   * listing properties which can be provided at hydration time for the
   * associated element.
   *
   * Similar in structure and usage as {@link HTMLElementTagNameMap}.
   */
  interface HTMLElementHydrationParamsMap {}
}
