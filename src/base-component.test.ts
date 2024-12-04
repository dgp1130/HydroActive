import { BaseHydrateLifecycle, defineBaseComponent } from './base-component.js';
import { parseHtml } from './testing.js';

describe('base-component', () => {
  afterEach(() => {
    for (const el of document.body.children) el.remove();
  });

  describe('defineBaseComponent', () => {
    it('upgrades already rendered components when defined', () => {
      const el = document.createElement('already-rendered');
      document.body.append(el);

      const hydrate = jasmine.createSpy<BaseHydrateLifecycle<any>>('hydrate');
      const Comp = defineBaseComponent('already-rendered', hydrate);
      Comp.define();

      expect(hydrate).toHaveBeenCalledTimes(1);
    });

    it('updates components rendered after definition', () => {
      const hydrate = jasmine.createSpy<BaseHydrateLifecycle<any>>('hydrate');

      const Comp = defineBaseComponent('new-component', hydrate);
      Comp.define();
      expect(hydrate).not.toHaveBeenCalled();

      const comp = document.createElement('new-component');
      expect(hydrate).not.toHaveBeenCalled();

      document.body.appendChild(comp);
      expect(hydrate).toHaveBeenCalledTimes(1);
    });

    it('invokes hydrate callback without a `this` value', () => {
      // Can't use Jasmine spies here because they will default `this` to
      // `window` because they are run in "sloppy mode".
      let self: unknown = 'defined' /* initial value other than undefined */;
      function hydrate(this: unknown): void {
        self = this;
      }

      const Comp = defineBaseComponent('this-component', hydrate);
      Comp.define();

      const comp = document.createElement('this-component');
      document.body.appendChild(comp);

      expect(self).toBeUndefined();
    });

    it('invokes hydrate callback with a `ComponentAccessor` of the component host', () => {
      const hydrate = jasmine.createSpy<BaseHydrateLifecycle<any>>('hydrate');
      const HostComponent = defineBaseComponent('host-component', hydrate);

      const el = parseHtml(HostComponent, `
        <host-component>
          <span>Hello!</span>
        </host-component>
      `);
      document.body.appendChild(el);

      expect(hydrate).toHaveBeenCalledTimes(1);
      const [ accessor ] = hydrate.calls.first().args;

      // `ComponentAccessor` should be appropriately configured for the element.
      expect(accessor.query('span').access().read(String)).toBe('Hello!');
    });

    it('applies the component definition returned by the `hydrate` callback', () => {
      const hydrate = jasmine.createSpy<BaseHydrateLifecycle<any>>('hydrate')
          .and.returnValue({ foo: 'bar' });

      const CompWithDef = defineBaseComponent('comp-with-def', hydrate);

      const el = parseHtml(CompWithDef, `<comp-with-def></comp-with-def>`);
      document.body.appendChild(el);

      expect(el.foo).toBe('bar');
    });

    it('sets the class name', () => {
      const Comp = defineBaseComponent('foo-bar-baz', () => {});
      expect(Comp.name).toBe('FooBarBaz');
    });
  });
});
