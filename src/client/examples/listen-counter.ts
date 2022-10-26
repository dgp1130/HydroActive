import { HydratableElement, live } from '../lib/hydrator.js';

class ListenCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    // Easy binding of events. Automatically removes the listener when disconnected.
    this.listen('#increment', 'click', () => { this.count++; });
    this.listen('#decrement', 'click', () => { this.count--; });
  }
}

customElements.define('listen-counter', ListenCounter);
