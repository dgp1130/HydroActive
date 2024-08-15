import { parseHtml } from 'hydroactive/testing.js';
import { ClosedShadow } from './closed-shadow.js';

describe('closed-shadow', () => {
  afterEach(() => {
    for (const node of document.body.childNodes) node.remove();
  });

  describe('ClosedShadow', () => {
    function render(): InstanceType<typeof ClosedShadow> {
      return parseHtml(ClosedShadow, `
        <closed-shadow>
          <template shadowrootmode="closed">
            <style>
              div { color: blue; }
            </style>

            <h2>Closed Shadow</h2>

            <div>Hello</div>
            <slot></slot>
          </template>

          <div>Goodbye</div>
        </closed-shadow>
      `);
    }

    it('updates the light and shadow DOM', async () => {
      // The shadow root is closed, so it is not accessible at
      // `Element.prototype.shadowRoot`. Instead, spy on
      // `HTMLElement.prototype.attachInternals` to extract the
      // `ElementInternals` object containing the shadow DOM.
      let internals!: ElementInternals;
      const attachInternals = HTMLElement.prototype.attachInternals;
      spyOn(HTMLElement.prototype, 'attachInternals').and.callFake(
        function (this: HTMLElement, ...args: Parameters<HTMLElement['attachInternals']>) {
          internals = attachInternals.call(this, ...args);
          return internals;
        },
      );

      const el = render();
      document.body.append(el);

      await el.stable();

      const shadowDiv = internals.shadowRoot!.querySelector('div')!;
      expect(shadowDiv.textContent).toBe('I\'m blue,');

      const lightDiv = el.querySelector('div')!;
      expect(lightDiv.textContent).toBe('Da ba dee da ba di...');
    });
  });
});
