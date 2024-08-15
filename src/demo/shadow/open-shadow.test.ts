import { parseHtml } from 'hydroactive/testing.js';
import { OpenShadow } from './open-shadow.js';

describe('open-shadow', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  describe('OpenShadow', () => {
    function render(): InstanceType<typeof OpenShadow> {
      return parseHtml(OpenShadow, `
        <open-shadow>
          <template shadowrootmode="open">
            <style>
              div { color: red; }
            </style>

            <h2>Open Shadow</h2>

            <div>Hello</div>
            <slot></slot>
          </template>

          <div>Goodbye</div>
        </open-shadow>
      `);
    }

    it('updates the light and shadow DOM', async () => {
      const el = render();
      document.body.append(el);

      await el.stable();

      const shadowDiv = el.shadowRoot!.querySelector('div')!;
      expect(shadowDiv.textContent).toBe('I\'m red!');

      const lightDiv = el.querySelector('div')!;
      expect(lightDiv.textContent).toBe('I\'m not...');
    });
  });
});
