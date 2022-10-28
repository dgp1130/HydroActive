import { HydratableElement, hydrate, live } from '../lib/hydrator.js';

class DeferredInnerCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  public increment(): void {
    this.count++;
  }
  public decrement(): void {
    this.count--;
  }
}
customElements.define('deferred-inner-counter', DeferredInnerCounter);

class DeferredOuterCounter extends HydratableElement {
  // Because this inner component is referenced by `@hydrate`, it gets hydrated first!
  // Currently no attempt is made to discover other deferred components in the tree,
  // which could be unintuitive for some folks. Maybe it would make sense to walk the
  // shadow DOM and direct light DOM children?
  @hydrate('deferred-inner-counter', DeferredInnerCounter)
  private innerCounter!: DeferredInnerCounter;

  protected override hydrate(): void {
    // Inner counter is accessible and hydrated.
    this.innerCounter.increment();

    const increment = this.query('button#increment');
    this.listen(increment, 'click', () => { this.innerCounter.increment(); });
    increment.disabled = false;

    const decrement = this.query('button#decrement');
    this.listen(decrement, 'click', () => { this.innerCounter.decrement(); });
    decrement.disabled = false;
  }
}
customElements.define('deferred-outer-counter', DeferredOuterCounter);
