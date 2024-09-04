import './testing/noop-component.js';

import { Connector } from './connectable.js';
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

    describe('connected', () => {
      it('proxies to the underlying `Connectable`', () => {
        const connector = Connector.from(/* isConnected */ () => false);
        spyOn(connector, 'connected');

        const el = document.createElement('noop-component');
        spyOnProperty(el, '_connectable', 'get').and.returnValue(connector);

        const accessor = ComponentAccessor.fromComponent(el);

        const onConnect = () => {};
        accessor.connected(onConnect);

        expect(connector.connected).toHaveBeenCalledOnceWith(onConnect);
      });
    });
  });
});
