import { hit, hydrate } from 'hydroactive/testing.js';

import { CounterDisplay, StateHostCounter } from './props-counter.js';

describe('CounterDisplay', () => {
  hit('counter-display#hydrates', 'hydrates initial count', (counter) => {
    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter, CounterDisplay);

    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');
    expect(counter.initialCount).toBe(5);
  });

  hit('counter-display#prop', 'hydrates with provided property', (counter) => {
    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter, CounterDisplay, { count: 10 });

    expect(counter.shadowRoot!.textContent).toContain('The count is: 10.'); // Prop bound to DOM.
    expect(counter.initialCount).toBe(5); // Value read from HTML.
  });
});

describe('StateHostCounter', () => {
  hit('state-host-counter#increments', 'increments', (counter) => {
    const display = counter.shadowRoot!.querySelector('counter-display')!;
    expect(display.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter, StateHostCounter);

    // Hydration should not change displayed count.
    expect(display.shadowRoot!.textContent).toContain('The count is: 5.');

    // Clicks should increment the count.
    const increment = counter.shadowRoot!.querySelector('#increment')! as HTMLButtonElement;
    increment.click();
    expect(display.shadowRoot!.textContent).toContain('The count is: 6.');
  });

  hit('state-host-counter#decrements', 'decrements', (counter) => {
    const display = counter.shadowRoot!.querySelector('counter-display')!;
    expect(display.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter, StateHostCounter);

    // Hydration should not change displayed count.
    expect(display.shadowRoot!.textContent).toContain('The count is: 5.');

    // Clicks should decrement the count.
    const decrement = counter.shadowRoot!.querySelector('#decrement')! as HTMLButtonElement;
    decrement.click();
    expect(display.shadowRoot!.textContent).toContain('The count is: 4.');
  });
});
