import { component, ComponentDef } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';
import { parseDomFragment } from '../html-fragments/dom.js';

export const EditableToot = component('editable-toot', ($: ComponentDef<{ tootId: number, content: string }>) => {
  const tootId = $.host.tootId!;
  const content = useInput($, 'input', $.host.content!);

  $.listen($.query('form'), 'submit', async (evt) => {
    evt.preventDefault();

    const url = new URL('/toot/edit', location.href);
    url.searchParams.set('id', tootId.toString());
    url.searchParams.set('content', content());

    const res = await fetch(url, { method: 'POST' });
    const template = await parseDomFragment(res);
    const editedToot = template.content.cloneNode(true /* deep */);
    $.host.replaceWith(editedToot);
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'editable-toot': InstanceType<typeof EditableToot>;
  }
}

function useInput($: ComponentDef, selector: string, initialValue?: string): Accessor<string> {
  const input = $.hydrate(selector, HTMLInputElement) as HTMLInputElement; // TODO: Unnecessary cast.
  if (initialValue !== undefined) input.value = initialValue;
  const [ value, setValue ] = createSignal(input.value);

  $.listen(input, 'change', () => {
    setValue(input.value);
  });

  return value;
}
