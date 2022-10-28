import { HydratableElement, live } from '../lib/hydrator.js';

class DeferredCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    const decrement = this.query('button#decrement');
    this.listen(decrement, 'click', () => this.count--);
    decrement.disabled = false;

    const increment = this.query('button#increment');
    this.listen(increment, 'click', () => this.count++);
    increment.disabled = false;
  }
}

customElements.define('deferred-counter', DeferredCounter);
