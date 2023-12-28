import { parseHtml } from 'hydroactive/testing.js';
import { ReadAttr } from './read-attr.js';

describe('read-attr', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  function render({ id }: { id: number }) {
    return parseHtml(ReadAttr, `
      <read-attr user-id="${id}">
        <h2>Read Attribute</h2>

        <div>Hello, <span>-</span>!</div>
      </read-attr>
    `);
  }

  describe('ReadAttr', () => {
    it('renders the user name on hydration', async () => {
      const el = render({ id: 1234 });
      document.body.appendChild(el);

      await el.stable();

      expect(el.querySelector('span')!.textContent).toBe('Devel');
    });
  });
});
