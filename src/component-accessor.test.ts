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
    });

    describe('shadow', () => {
      it('returns an attached open shadow root', () => {
        const el = document.createElement('noop-component');
        const shadowRoot = el.attachShadow({ mode: 'open' });

        const comp = ComponentAccessor.fromComponent(el);

        expect(comp.shadow.root).toBe(shadowRoot);
      });

      it('returns an attached closed shadow root', () => {
        const el = document.createElement('noop-component');
        const shadowRoot = el.attachShadow({ mode: 'closed' });

        const comp = ComponentAccessor.fromComponent(el);

        expect(comp.shadow.root).toBe(shadowRoot);
      });

      it('throws an error when no shadow root is attached', () => {
        const el = document.createElement('noop-component');

        const comp = ComponentAccessor.fromComponent(el);

        expect(() => comp.shadow.root)
            .toThrowError(/does not have a shadow root/);
      });

      it('returns an open shadow root attached after the component is instantiated', () => {
        const el = document.createElement('noop-component');

        const comp = ComponentAccessor.fromComponent(el);
        const shadowRoot = el.attachShadow({ mode: 'open' });

        expect(comp.shadow.root).toBe(shadowRoot);
      });

      it('returns a closed shadow root attached after the component is instantiated', () => {
        const el = document.createElement('noop-component');

        const comp = ComponentAccessor.fromComponent(el);
        const shadowRoot = el.attachShadow({ mode: 'closed' });

        expect(comp.shadow.root).toBe(shadowRoot);
      });
    });
  });
});
