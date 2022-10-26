import { HydratableElement, live } from '../lib/hydrator.js';

class DeferredCounter extends HydratableElement {
  @live('span', Number)
  private count!: number;

  protected override hydrate(): void {
    this.bind('#decrement', 'click', () => this.count--);
    (this.shadowRoot!.querySelector('#decrement')! as HTMLButtonElement).disabled = false;

    this.bind('#increment', 'click', () => this.count++);
    (this.shadowRoot!.querySelector('#increment')! as HTMLButtonElement).disabled = false;
  }
}

customElements.define('deferred-counter', DeferredCounter);
