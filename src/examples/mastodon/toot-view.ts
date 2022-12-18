import { attr, component } from 'hydroactive';
import { createEditableToot } from './editable-toot.js';

export const TootView = component(($) => {
  const tootId = $.hydrate(':host', Number, attr('toot-id'));
  const content = $.hydrate('span', String);

  $.listen($.query('button'), 'click', () => {
    $.host.replaceWith(createEditableToot({ tootId, content }));
  });
});

customElements.define('toot-view', TootView);

declare global {
  interface HTMLElementTagNameMap {
    'toot-view': InstanceType<typeof TootView>;
  }
}
