import { hydrate, query } from 'hydroactive/testing.js';

import { CounterDisplay, StateHostCounter } from './props-counter.js';

describe('CounterDisplay', () => {
  it('hydrates initial count', () => {
    const counter = query('counter-display#hydrates', CounterDisplay);
    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter);

    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');
    expect(counter.initialCount).toBe(5);
  });

  it('hydrates with provided property', () => {
    const counter = query('counter-display#prop', CounterDisplay);
    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter, { count: 10 });

    expect(counter.shadowRoot!.textContent).toContain('The count is: 10.'); // Prop bound to DOM.
    expect(counter.initialCount).toBe(5); // Value read from HTML.
  });
});

describe('StateHostCounter', () => {
  it('increments', () => {
    const counter = query('state-host-counter#increments', StateHostCounter);
    const display = counter.shadowRoot!.querySelector('counter-display')!;
    expect(display.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter);

    // Hydration should not change displayed count.
    expect(display.shadowRoot!.textContent).toContain('The count is: 5.');

    // Clicks should increment the count.
    const increment = counter.shadowRoot!.querySelector('#increment')! as HTMLButtonElement;
    increment.click();
    expect(display.shadowRoot!.textContent).toContain('The count is: 6.');
  });

  it('decrements', () => {
    const counter = query('state-host-counter#decrements', StateHostCounter);
    const display = counter.shadowRoot!.querySelector('counter-display')!;
    expect(display.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter);

    // Hydration should not change displayed count.
    expect(display.shadowRoot!.textContent).toContain('The count is: 5.');

    // Clicks should decrement the count.
    const decrement = counter.shadowRoot!.querySelector('#decrement')! as HTMLButtonElement;
    decrement.click();
    expect(display.shadowRoot!.textContent).toContain('The count is: 4.');
  });
});
