import { QueriedElement } from './query.js';

export interface Queryable<El extends Element> {
  query<Selector extends string>(selector: Selector):
      Queryable<QueriedElement<Selector, El>>;
}

/** TODO */
export function queryEl<El extends Element, Selector extends string>(
  root: El,
  selector: Selector,
): QueriedElement<Selector, El> {
  const result = root.querySelector(selector);

  if (!result) {
    throw new Error('Found no element.'); // TODO
  }

  return result as QueriedElement<Selector, El>;
}
