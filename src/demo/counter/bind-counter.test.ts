import { parseHtml } from 'hydroactive/testing.js';
import { BindCounter } from './bind-counter.js';

describe('bind-counter', () => {
  beforeEach(() => { jasmine.clock().install(); });
  afterEach(() => { jasmine.clock().uninstall(); });

  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  function render({ count }: { count: number }) {
    return parseHtml(BindCounter, `
      <bind-counter>
        <div>The current count is: <span>${count}</span>.</div>
      </bind-counter>
    `);
  }

  describe('BindCounter', () => {
    it('does not re-render on hydration', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      await el.stable();

      expect(el.querySelector('span')!.textContent).toBe('5');
    });

    it('updates the count every second', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      jasmine.clock().tick(1_000);
      await el.stable();

      expect(el.querySelector('span')!.textContent).toBe('6');
    });

    it('pauses the count while disconnected', async () => {
      const el = render({ count: 5 });

      document.body.appendChild(el);
      el.remove(); // Should pause timer.

      jasmine.clock().tick(1_000);
      await el.stable();

      // Should not have incremented.
      expect(el.querySelector('span')!.textContent).toBe('5');
    });

    it('resumes the count when reconnected', async () => {
      const el = render({ count: 5 });

      document.body.appendChild(el);
      el.remove(); // Should pause timer.

      jasmine.clock().tick(3_000);

      document.body.appendChild(el); // Should resume timer.

      jasmine.clock().tick(1_000);
      await el.stable();

      // Should have incremented only once.
      expect(el.querySelector('span')!.textContent).toBe('6');
    });
  });
});
