import { HydratableElement, hydrate, live } from 'hydroactive/class.js';

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
customElements.define('inner-counter-class', InnerCounter);
declare global {
  interface HTMLElementTagNameMap {
    'inner-counter-class': InnerCounter;
  }
}

class OuterCounter extends HydratableElement {
  @hydrate('inner-counter-class', InnerCounter)
  private innerCounter!: InnerCounter;

  protected override hydrate(): void {
    // Child elements are hydrated first, so this is already loaded and works!
    // Note that `HydratableElement` cannot force the custom element classes to be
    // loaded for all its children, so if `outer-counter` is defined *before*
    // `inner-counter`, you're gonna have a bad time. `@hydrate()` naturally requires
    // this anyways because it needs a reference to the child component class which
    // forces it to be defined first.
    this.innerCounter.increment();

    const decrement = this.query('button#decrement');
    this.listen(decrement, 'click', () => { this.innerCounter.decrement(); });

    const increment = this.query('button#increment');
    this.listen(increment, 'click', () => { this.innerCounter.increment(); });
  }
}
customElements.define('outer-counter-class', OuterCounter);
declare global {
  interface HTMLElementTagNameMap {
    'outer-counter-class': OuterCounter;
  }
}
