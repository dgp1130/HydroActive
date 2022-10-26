import { HydratableElement, live } from '../lib/hydrator.js';

class LiveCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    setInterval(() => { this.count++; }, 1_000);
  }
}

customElements.define('live-counter', LiveCounter);
