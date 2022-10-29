import { HydratableElement, hydrate, live } from '../lib/hydrator.js';

class InnerCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  public increment(): void {
    this.count++;
  }
  public decrement(): void {
    this.count--;
  }
}
customElements.define('inner-counter', InnerCounter);
declare global {
  interface HTMLElementTagNameMap {
    'inner-counter': InnerCounter;
  }
}

class OuterCounter extends HydratableElement {
  @hydrate('inner-counter', InnerCounter)
  private innerCounter!: InnerCounter;

  protected override hydrate(): void {
    // Child elements are hydrated first, so this is already loaded and works!
    // Note that `HydratableElement` cannot force the custom element classes to be
    // loaded for all its children, so if `deferred-outer-counter` is defined *before*
    // `deferred-inner-counter`, you're gonna have a bad time. `@hydrate()` naturally
    // requires this anyways because it needs a reference to the child component class
    // which forces it to be defined first.
    this.innerCounter.increment();

    const decrement = this.query('button#decrement');
    this.listen(decrement, 'click', () => { this.innerCounter.decrement(); });

    const increment = this.query('button#increment');
    this.listen(increment, 'click', () => { this.innerCounter.increment(); });
  }
}
customElements.define('outer-counter', OuterCounter);
declare global {
  interface HTMLElementTagNameMap {
    'outer-counter': OuterCounter;
  }
}
