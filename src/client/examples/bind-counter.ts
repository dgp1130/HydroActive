import { bind, HydratableElement, hydrate } from '../lib/hydrator.js';

class BindCounter extends HydratableElement {
  // `@hydrate()` and `@bind()` together are equivalent to `@live('span', Number)`!
  @hydrate('span', Number)
  @bind('span')
  private count!: number;

  protected override hydrate(): void {
    setInterval(() => { this.count++; }, 1_000);
  }
}

customElements.define('bind-counter', BindCounter);

declare global {
  interface HTMLElementTagNameMap {
    'bind-counter': BindCounter;
  }
}
