import { expect } from '@esm-bundle/chai';
import { hydrate, query } from 'hydroactive/testing.js';
import { SinonFakeTimers, useFakeTimers } from 'sinon'; // TODO: Find a better clock mocking solution. Maybe use Jasmine?

import { LiveCounter } from './live-counter.js';

describe('LiveCounter', () => {
  let clock: SinonFakeTimers;

  beforeEach(() => {
    clock = useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('increments over time', () => {
    const counter = query('live-counter#increments', LiveCounter);
    expect(counter.shadowRoot!.textContent).to.contain('The count is: 5.');

    hydrate(counter, {});

    expect(counter.shadowRoot!.textContent).to.contain('The count is: 5.');
    clock.tick(1_000);
    expect(counter.shadowRoot!.textContent).to.contain('The count is: 6.');
    clock.tick(1_000);
    expect(counter.shadowRoot!.textContent).to.contain('The count is: 7.');
  });
});
