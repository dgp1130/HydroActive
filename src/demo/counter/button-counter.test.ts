import { parseHtml } from 'hydroactive/testing.js';
import { ButtonCounter } from './button-counter.js';

describe('button-counter', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  function render({ count }: { count: number }) {
    return parseHtml(ButtonCounter, `
      <button-counter>
        <div>The current count is: <span>${count}</span>.</div>
        <button id="decrement">-</button>
        <button id="increment">+</button>
      </button-counter>
    `);
  }

  describe('ButtonCounter', () => {
    it('does not re-render on hydration', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      await el.stable();

      expect(el.querySelector('span')!.textContent).toBe('5');
    });

    it('decrements on click', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      (el.querySelector('#decrement')! as HTMLElement).click();

      await el.stable();

      expect(el.querySelector('span')!.textContent).toBe('4');
    });

    it('increments on click', async () => {
      const el = render({ count: 5 });
      document.body.appendChild(el);

      (el.querySelector('#increment')! as HTMLElement).click();

      await el.stable();

      expect(el.querySelector('span')!.textContent).toBe('6');
    });
  });
});
