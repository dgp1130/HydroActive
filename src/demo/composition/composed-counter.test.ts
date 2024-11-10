import { parseHtml } from 'hydroactive/testing.js';
import { CounterController, CounterDisplay } from './composed-counter.js';

describe('composed-counter', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  function renderDisplay({ count }: { count: number }) {
    return parseHtml(CounterDisplay, `
      <counter-display>
        <div>The current count is: <span>${count}</span>.</div>
      </counter-display>
    `);
  }

  function renderController({ count }: { count: number }) {
    return parseHtml(CounterController, `
      <counter-controller>
        <h2>Composed Counter</h2>

        ${renderDisplay({ count }).outerHTML}

        <button id="decrement">-</button>
        <button id="increment">+</button>
      </counter-controller>
    `, [ CounterDisplay ]);
  }

  describe('CounterDisplay', () => {
    describe('decrement', () => {
      it('decrements the count', async () => {
        const el = renderDisplay({ count: 5 });
        document.body.appendChild(el);

        el.decrement();

        await el.stable();

        expect(el.querySelector('span')!.textContent).toBe('4');
      });
    });

    describe('increment', () => {
      it('increments the count', async () => {
        const el = renderDisplay({ count: 5 });
        document.body.appendChild(el);

        el.increment();

        await el.stable();

        expect(el.querySelector('span')!.textContent).toBe('6');
      });
    });
  });

  describe('CounterController', () => {
    it('decrements the count when clicked', async () => {
      const ctrl = renderController({ count: 5 });
      document.body.appendChild(ctrl);

      (ctrl.querySelector('button#decrement')! as HTMLButtonElement).click();

      const display = ctrl.querySelector('counter-display')!;
      await display.stable();

      expect(display.querySelector('span')!.textContent).toBe('4');
    });

    it('increments the count when clicked', async () => {
      const ctrl = renderController({ count: 5 });
      document.body.appendChild(ctrl);

      (ctrl.querySelector('button#increment')! as HTMLButtonElement).click();

      const display = ctrl.querySelector('counter-display')!;
      await display.stable();

      expect(display.querySelector('span')!.textContent).toBe('6');
    });
  });
});
