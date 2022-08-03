import { HydratableElement, hydrate, property } from '../lib/hydrator.js';

class BoundCounter extends HydratableElement {
    @property @hydrate('span', Number)
    private count!: number;

    @hydrate('span', HTMLSpanElement)
    private counter!: HTMLSpanElement;

    protected override hydrate(): void {
        // Easy binding of events. Automatically removes the listener when disconnected.
        this.bind('#increment', 'click', () => this.count++);
        this.bind('#decrement', 'click', () => this.count--);
    }

    protected override update(): void {
        this.counter.textContent = this.count.toString();
    }
}

customElements.define('bound-counter', BoundCounter);
