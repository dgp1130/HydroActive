import { HydratableElement, live } from '../lib/hydrator.js';

class IslandCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    const decrement = this.listen('button#decrement', 'click', () => this.count--);
    decrement.disabled = false;

    const increment = this.listen('button#increment', 'click', () => this.count++);
    increment.disabled = false;
  }
}

customElements.define('island-counter', IslandCounter);
