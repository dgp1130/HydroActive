import { component, ComponentDef, factory } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';
import { parseDomFragment } from '../html-fragments/dom.js';

export const EditableTweet = component(($: ComponentDef<{ tweetId: number, content: string }>) => {
  const tweetId = $.host.tweetId!;
  const content = useInput($, 'input', $.host.content!);

  $.listen($.query('form'), 'submit', async (evt) => {
    evt.preventDefault();

    const url = new URL('/tweet/edit', location.href);
    url.searchParams.set('id', tweetId.toString());
    url.searchParams.set('content', content());

    const res = await fetch(url, { method: 'POST' });
    const template = await parseDomFragment(res);
    const editedTweet = template.content.cloneNode(true /* deep */);
    $.host.replaceWith(editedTweet);
  });
});

export const createEditableTweet = factory(EditableTweet);

customElements.define('editable-tweet', EditableTweet);

declare global {
  interface HTMLElementTagNameMap {
    'editable-tweet': InstanceType<typeof EditableTweet>;
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
