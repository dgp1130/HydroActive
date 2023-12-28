import { parseHtml } from 'hydroactive/testing.js';
import { ComputedValue } from './computed-value.js';

describe('computed-value', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  function render({ count }: { count: number }) {
    return parseHtml(ComputedValue, `
      <computed-value>
        <div>The current count is: <span id="count">${count}</span>.</div>
        <div>The negative count is: <span id="negative">${-count}</span>.</div>
        <button>+</button>
      </computed-value>
    `);
  }

  describe('ComputedValue', () => {
    it('does not re-render on hydration', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      await el.stable();

      expect(el.querySelector('#count')!.textContent).toBe('5');
      expect(el.querySelector('#negative')!.textContent).toBe('-5');
    });

    it('increments on click', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      (el.querySelector('button')! as HTMLElement).click();

      await el.stable();

      expect(el.querySelector('#count')!.textContent).toBe('6');
      expect(el.querySelector('#negative')!.textContent).toBe('-6');
    });
  });
});
