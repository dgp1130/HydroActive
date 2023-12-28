import { parseHtml } from 'hydroactive/testing.js';
import { HelloWorld } from './hello-world.js';

describe('hello-world', () => {
  describe('HelloWorld', () => {
    it('updates the name to "HydroActive"', async () => {
      const el = parseHtml(HelloWorld, `
        <hello-world>
          <div>Hello, <span id="name">World</span>!</div>
        </hello-world>
      `);
      document.body.appendChild(el);

      await el.stable();

      expect(el.querySelector('#name')!.textContent).toBe('HydroActive');
    });
  });
});
