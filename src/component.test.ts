import { component, HydrateLifecycle } from './component.js';
import { ComponentRef } from './component-ref.js';
import { ElementRef } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { testCase, useTestCases } from './testing/test-cases.js';

describe('component', () => {
  useTestCases();

  afterEach(() => {
    for (const child of Array.from(document.body.childNodes)) {
      child.remove();
    }
  });

  describe('component', () => {
    it('upgrades already rendered components', testCase('already-rendered', () => {
      const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
      component('already-rendered', hydrate);

      expect(hydrate).toHaveBeenCalledTimes(1);
    }));

    it('upgrades components rendered after definition', () => {
      const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');

      component('new-component', hydrate);
      expect(hydrate).not.toHaveBeenCalled();

      const comp = document.createElement('new-component');
      expect(hydrate).not.toHaveBeenCalled();

      document.body.appendChild(comp);
      expect(hydrate).toHaveBeenCalledTimes(1);
    });

    it('invokes hydrate callback without a `this` value', () => {
      // Can't use Jasmine spies here because they will default `this` to `window`
      // because they are run in "sloppy mode".
      let self: unknown = 'defined' /* initial value other than undefined */;
      function hydrate(this: unknown): void {
        self = this;
      }

      component('this-component', hydrate);

      const comp = document.createElement('this-component');
      document.body.appendChild(comp);

      expect(self).toBeUndefined();
    });

    it('invokes hydrate callback with an `ElementRef` of the component host', () => {
      const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
      component('host-component', hydrate);

      const comp =
          document.createElement('host-component') as HydroActiveComponent;
      document.body.appendChild(comp);

      expect(hydrate).toHaveBeenCalledOnceWith(
          ComponentRef._from(ElementRef.from(comp)));
    });

    it('sets the class name', () => {
      {
        const Comp = component('foo-bar-baz', () => {});
        expect(Comp.name).toBe('FooBarBaz');
      }

      {
        const Comp = component('foo-bar-', () => {});
        expect(Comp.name).toBe('FooBar');
      }

      {
        const Comp = component('foo-----bar', () => {});
        expect(Comp.name).toBe('FooBar');
      }
    });
  });
});
