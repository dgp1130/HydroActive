import { Dehydrated } from './dehydrated.js';
import { QueriedElement } from './query.js';

/**
 * Represents an element which can query for descendants matching a specific CSS
 * selector.
 */
export class QueryableElement<El extends Element> {
  #root: El | ShadowRoot;

  protected constructor(root: El | ShadowRoot) {
    this.#root = root;
  }

  /** TODO */
  public static from<El extends Element>(native: El): QueryableElement<El> {
    return new QueryableElement(native);
  }

  /** TODO */
  public static fromShadowRoot(root: ShadowRoot): QueryableElement<Element> {
    return new QueryableElement(root);
  }

  /** TODO */
  public query<Selector extends string>(selector: Selector):
      Dehydrated<QueriedElement<Selector, El>> {
    return Dehydrated.from(queryEl(this.#root, selector));
  }

  /** TODO */
  public queryAll<Selector extends string>(selector: Selector):
      Array<Dehydrated<QueriedElement<Selector, El>>> {
    return []; // TODO
  }
}

export class Queryable<El extends Element> extends QueryableElement<El> {
  #root: El | ShadowRoot;

  protected constructor(root: El | ShadowRoot) {
    super(root);

    this.#root = root;
  }

  public static override from<El extends Element>(root: El): Queryable<El> {
    return new Queryable(root);
  }

  /** TODO */
  public get shadow(): QueryableElement<El> {
    if (!(this.#root instanceof Element)) {
      throw new Error('Already a shadow root!');
    }

    if (!this.#root.shadowRoot) {
      throw new Error('No shadow root or shadow root is closed!');
    }

    return QueryableElement.fromShadowRoot(this.#root.shadowRoot) as
        QueryableElement<El>;
  }
}

/** TODO */
export function queryEl<El extends Element, Selector extends string>(
  root: El | ShadowRoot,
  selector: Selector,
): QueriedElement<Selector, El> {
  const result = root.querySelector(selector);

  if (!result) {
    throw new Error('Found no element.'); // TODO
  }

  return result as QueriedElement<Selector, El>;
}
