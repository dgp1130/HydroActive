import './testing/noop-component.js';

import { ComponentAccessor } from './component-accessor.js';

describe('component-accessor', () => {
  describe('ComponentAccessor', () => {
    describe('fromComponent', () => {
      it('creates a `ComponentAccessor` from a `HydroActiveComponent`', () => {
        const el = document.createElement('noop-component');

        const comp = ComponentAccessor.fromComponent(el);

        expect(comp.element).toBe(el);
      });

      it('creates a `ComponentAccessor` whose `shadow` queries a closed shadow root', () => {
        const el = document.createElement('noop-component');
        const shadowRoot = el.attachShadow({ mode: 'closed' });

        const comp = ComponentAccessor.fromComponent(el);

        expect(comp.shadow.root).toBe(shadowRoot);
      });
    });
  });
});
