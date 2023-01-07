import { hydrate } from 'hydroactive';
import { hit } from 'hydroactive/testing.js';

import { LiveCounter } from './live-counter.js';

describe('LiveCounter', () => {
  const clock = jasmine.clock();

  beforeEach(() => {
    clock.install();
  });

  afterEach(() => {
    clock.uninstall();
  });

  hit('live-counter#increments', 'increments over time', (counter) => {
    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');

    hydrate(counter, LiveCounter);

    expect(counter.shadowRoot!.textContent).toContain('The count is: 5.');
    clock.tick(1_000);
    expect(counter.shadowRoot!.textContent).toContain('The count is: 6.');
    clock.tick(1_000);
    expect(counter.shadowRoot!.textContent).toContain('The count is: 7.');
  });
});
