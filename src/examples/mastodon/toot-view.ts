import { attr, component, hydrate } from 'hydroactive';
import { EditableToot } from './editable-toot.js';

export const TootView = component(($) => {
  const editTootTemplate = $.query('template');
  const tootId = $.hydrate(':host', Number, attr('toot-id'));
  const content = $.hydrate('span', String);

  $.listen($.query('button'), 'click', () => {
    const editToot = (editTootTemplate.content.cloneNode(true /* deep */) as Element).firstElementChild!;
    hydrate(editToot, EditableToot, { tootId, content });
    $.host.replaceWith(editToot);
  });
});

customElements.define('toot-view', TootView);

declare global {
  interface HTMLElementTagNameMap {
    'toot-view': InstanceType<typeof TootView>;
  }
}
