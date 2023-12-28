import { parseHtml } from 'hydroactive/testing.js';
import { SignalEffect } from './signal-effect.js';

describe('signal-effect', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  function render({ count }: { count: number }) {
    return parseHtml(SignalEffect, `
      <signal-effect>
        <div>The current count is: <span id="count">${count}</span>.</div>
        <div>
            The count has been updated: <span id="updates">0</span> times.
        </div>
        <button>+</button>
      </signal-effect>
    `);
  }

  describe('SignalEffect', () => {
    it('updates once on hydration', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      await el.stable();

      expect(el.querySelector('#count')!.textContent).toBe('5');
      expect(el.querySelector('#updates')!.textContent).toBe('1');
    });

    it('increments on click', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);
      await el.stable(); // Update after hydration.

      (el.querySelector('button')! as HTMLElement).click();
      await el.stable(); // Update after click.

      expect(el.querySelector('#count')!.textContent).toBe('6');
      expect(el.querySelector('#updates')!.textContent).toBe('2');
    });
  });
});
