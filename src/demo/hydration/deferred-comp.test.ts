import { parseHtml } from 'hydroactive/testing.js';
import { DeferredComp } from './deferred-comp.js';

describe('deferred-comp', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  function render(): InstanceType<typeof DeferredComp> {
    return parseHtml(DeferredComp, `
      <deferred-comp defer-hydration>
        <div>Hello, <span>World</span>!</div>
      </deferred-comp>
    `);
  }

  describe('DeferredComp', () => {
    it('does not hydrate on connection', () => {
      const el = render();
      document.body.appendChild(el);

      // Component upgrades immediately.
      expect(el).toBeInstanceOf(DeferredComp);

      // Hydration should be delayed.
      expect(el.querySelector('span')!.textContent).toBe('World');
    });

    it('hydrates when `defer-hydration` is removed', async () => {
      const el = render();
      document.body.appendChild(el);

      el.removeAttribute('defer-hydration');

      // Hydration is synchronous, but rendering is not.
      await el.stable();

      expect(el.querySelector('span')!.textContent).toBe('HydroActive');
    });
  });
});
