import { hydrate, query } from 'hydroactive/testing.js';

import { LiveCounter } from './live-counter.js';

describe('LiveCounter', () => {
  const clock = jasmine.clock();

  beforeEach(() => {
    clock.install();
  });

  afterEach(() => {
    clock.uninstall();
  });

  it('increments over time', () => {
    const counter = query('live-counter#increments', LiveCounter);
    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter, {});

    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');
    clock.tick(1_000);
    expect(counter.shadowRoot!.textContent).toContain('The count is: 6.');
    clock.tick(1_000);
    expect(counter.shadowRoot!.textContent).toContain('The count is: 7.');
  });
});
