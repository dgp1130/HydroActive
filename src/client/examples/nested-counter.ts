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

class NestedCounter extends HydratableElement {
  @hydrate('inner-counter', InnerCounter)
  private innerCounter!: InnerCounter;

  protected override hydrate(): void {
    const decrement = this.query('button#decrement');
    this.listen(decrement, 'click', () => { this.innerCounter.decrement(); });

    const increment = this.query('button#increment');
    this.listen(increment, 'click', () => { this.innerCounter.increment(); });
  }
}
customElements.define('nested-counter', NestedCounter);
