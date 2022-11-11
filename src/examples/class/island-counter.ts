import { HydratableElement, live } from 'hydrator/class.js';

class IslandCounter extends HydratableElement {
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

customElements.define('island-counter-class', IslandCounter);

declare global {
  interface HTMLElementTagNameMap {
    'island-counter-class': IslandCounter;
  }
}
