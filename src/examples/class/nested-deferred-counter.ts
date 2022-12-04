import { HydratableElement, hydrate, live } from 'hydroactive/class.js';

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
customElements.define('deferred-inner-counter-class', DeferredInnerCounter);
declare global {
  interface HTMLElementTagNameMap {
    'deferred-inner-counter-class': DeferredInnerCounter;
  }
}

class DeferredOuterCounter extends HydratableElement {
  @hydrate('deferred-inner-counter-class', DeferredInnerCounter)
  private innerCounter!: DeferredInnerCounter;

  protected override hydrate(): void {
    // Child elements are hydrated first, so this is already loaded and works!
    // Note that `HydratableElement` cannot force the custom element classes to be
    // loaded for all its children, so if `deferred-outer-counter` is defined *before*
    // `deferred-inner-counter`, you're gonna have a bad time. `@hydrate()` naturally
    // requires this anyways because it needs a reference to the child component class
    // which forces it to be defined first.
    this.innerCounter.increment();

    const increment = this.query('button#increment');
    this.listen(increment, 'click', () => { this.innerCounter.increment(); });
    increment.disabled = false;

    const decrement = this.query('button#decrement');
    this.listen(decrement, 'click', () => { this.innerCounter.decrement(); });
    decrement.disabled = false;
  }
}
customElements.define('deferred-outer-counter-class', DeferredOuterCounter);
declare global {
  interface HTMLElementTagNameMap {
    'deferred-outer-counter-class': DeferredOuterCounter;
  }
}
