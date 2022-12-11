import { HydratableElement, hydrate, attr, bind } from 'hydroactive/class.js';

// Map of counterId's to current counts.
const counterMap = new Map([
  [ 1234, 10 ],
]);

class AttrCounter extends HydratableElement {
  @hydrate(':host', Number, attr('counter-id'))
  private counterId!: number;

  @bind('span')
  private count!: number;

  protected override hydrate(): void {
    this.count = getCountFromId(this.counterId);

    const decrement = this.query('button#decrement');
    this.listen(decrement, 'click', () => { this.count--; });
    decrement.disabled = false;

    const increment = this.query('button#increment');
    this.listen(increment, 'click', () => { this.count++; });
    increment.disabled = false;
  }
}

customElements.define('attr-counter-class', AttrCounter);

declare global {
  interface HTMLElementTagNameMap {
    'attr-counter-class': AttrCounter;
  }
}

function getCountFromId(counterId: number): number {
  const count = counterMap.get(counterId);
  if (!count) throw new Error(`No counter for id \`${counterId}\`.`);
  return count;
}
