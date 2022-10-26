import { html, render, TemplateResult } from 'lit';
import { parseDomFragment } from '../lib/dom.js';
import { HydratableElement, hydrate } from '../lib/hydrator.js';

class InfiniteTweetList extends HydratableElement {
    @hydrate('ul', HTMLUListElement)
    private list!: HTMLUListElement;

    protected override hydrate(): void {
        this.listen('button', 'click', async () => {
            // Pick a random tweet using our superior ranking algorithm.
            const randomId = Math.floor(Math.random() * 10_000);
            const tweetUrl = new URL('/tweet', location.href);
            tweetUrl.searchParams.set('id', randomId.toString());

            // Fetch the tweet.
            const res = await fetch(tweetUrl);
            const template = await parseDomFragment(res);
            const tweet = template.content.cloneNode(true /* deep */);

            // Append it to the list, wrapped in a list element.
            this.list.append(renderFragment(html`<li>${tweet}</li>`));
        });
    }
}

customElements.define('my-infinite-tweet-list', InfiniteTweetList);

declare global {
    interface HTMLElementTagNameMap {
        'my-infinite-tweet-list': InfiniteTweetList;
    }
}

/**
 * lit-html's `render()` function requires a consistent host, so this is a nicer
 * wrapper around it.
 */
function renderFragment(template: TemplateResult): DocumentFragment {
    const frag = document.createDocumentFragment();
    render(template, frag);
    return frag;
}
