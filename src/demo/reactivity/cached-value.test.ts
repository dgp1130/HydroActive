import { parseHtml } from 'hydroactive/testing.js';
import { CachedValue } from './cached-value.js';

describe('cached-value', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  function render({ count }: { count: number }) {
    return parseHtml(CachedValue, `
      <cached-value>
        <div>The current count is: <span id="count">${count}</span>.</div>
        <div>Pi computed to that many decimal places is:
            <span id="pi">${computePiWithPrecision(count)}</span>.
        </div>
        <div>
            Pi is still:
              <span id="pi-again">${computePiWithPrecision(count)}</span>.
        </div>
        <button>+</button>
      </cached-value>
    `);
  }

  function computePiWithPrecision(precision: number): string {
    const length = '3.'.length + precision;
    return Math.PI.toFixed(48).slice(0, length).padEnd(length, '0');
  }

  describe('CachedValue', () => {
    it('does not re-render on hydration', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      await el.stable();

      expect(el.querySelector('#count')!.textContent).toBe('5');
      expect(el.querySelector('#pi')!.textContent).toBe('3.14159');
      expect(el.querySelector('#pi-again')!.textContent).toBe('3.14159');
    });

    it('increments on click', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      (el.querySelector('button')! as HTMLElement).click();

      await el.stable();

      expect(el.querySelector('#count')!.textContent).toBe('6');
      expect(el.querySelector('#pi')!.textContent).toBe('3.141592');
      expect(el.querySelector('#pi-again')!.textContent).toBe('3.141592');
    });

    it('reuses the PI computation', async () => {
      const consoleSpy = spyOn(console, 'log');

      const el = render({ count: 5 });
      document.body.appendChild(el);

      await el.stable();

      expect(consoleSpy)
          .toHaveBeenCalledOnceWith('Computing PI to 5 digits...');
      consoleSpy.calls.reset();

      (el.querySelector('button')! as HTMLElement).click();
      await el.stable();

      expect(consoleSpy)
          .toHaveBeenCalledOnceWith('Computing PI to 6 digits...');
    });
  });
});
