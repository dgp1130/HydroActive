import { HydratableElement, hydrate, property } from '../lib/hydrator.js';

class DeferredCounter extends HydratableElement {
  @hydrate('span', HTMLSpanElement)
  private counter!: HTMLSpanElement;

  @property @hydrate('span', Number)
  private count!: number;

  protected override hydrate(): void {
    this.bind('#decrement', 'click', () => this.count--);
    (this.shadowRoot!.querySelector('#decrement')! as HTMLButtonElement).disabled = false;

    this.bind('#increment', 'click', () => this.count++);
    (this.shadowRoot!.querySelector('#increment')! as HTMLButtonElement).disabled = false;
  }

  protected override update(): void {
    this.counter.textContent = this.count.toString();
  }
}

customElements.define('deferred-counter', DeferredCounter);
