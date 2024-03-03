import { hydrate, isHydrated } from 'hydroactive';
import { parseHtml } from 'hydroactive/testing.js';
import { DeferredComposition } from './deferred-composition.js';
import { DeferredCompositionChild } from './deferred-composition-child.js';

describe('deferred-composition', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  function render(): InstanceType<typeof DeferredComposition> {
    return parseHtml(DeferredComposition, `
      <deferred-composition defer-hydration>
        <deferred-composition-child id="first">
          <div>
            <span id="subject">Devel</span> says "Hello!" to
            <span id="target">World</span>!
          </div>
        </deferred-composition-child>

        <deferred-composition-child defer-hydration id="second">
          <div>
            <span id="subject">Owen</span> says "Hello!" to
            <span id="target">World</span>!
          </div>
        </deferred-composition-child>

        <div>The two speakers are named <span id="first-speaker">-</span> and
        <span id="second-speaker">-</span>.</div>
      </deferred-composition>
    `, [ DeferredCompositionChild ]);
  }

  describe('DeferredComposition', () => {
    it('does not block hydration of the first child', () => {
      const el = render();
      document.body.append(el);

      const firstChild = el.querySelector('#first')! as
          DeferredCompositionChild;
      expect(isHydrated(firstChild)).toBeTrue();

      expect(firstChild.querySelector('#target')!.textContent!)
          .toBe('HydroActive');
      expect(firstChild.getSpeakerName()).toBe('Devel');
    });

    it('hydrates the second child', () => {
      const el = render();
      document.body.append(el);

      hydrate(el, DeferredComposition);

      const secondChild = el.querySelector('#second')! as
          DeferredCompositionChild;
      expect(isHydrated(secondChild)).toBeTrue();

      expect(secondChild.querySelector('#target')!.textContent!)
          .toBe('HydroActive');
      expect(secondChild.getSpeakerName()).toBe('Owen');
    });

    it('hydrates the speaker names', async () => {
      const el = render();
      document.body.append(el);

      hydrate(el, DeferredComposition);
      await el.stable();

      expect(el.querySelector('#first-speaker')!.textContent!).toBe('Devel');
      expect(el.querySelector('#second-speaker')!.textContent!).toBe('Owen');
    });
  });
});
