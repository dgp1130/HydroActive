import { LitElement, TemplateResult, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { parseDomFragment } from '../lib/dom.js';

@customElement('my-editable-tweet')
class EditableTweet extends LitElement {
    @property()
    public tweetId!: number;

    @property()
    public content!: string;

    protected override render(): TemplateResult {
        return html`
            <input type="text" value="${this.content}" @change="${this.updateContent.bind(this)}" />
            <button type="submit" @click="${this.save.bind(this)}">Save</button>
        `;
    }

    private updateContent(evt: CustomEvent): void {
        this.content = (evt.target as HTMLInputElement).value;
    }

    private async save(_evt: Event): Promise<void> {
        const url = new URL('/tweet/edit', location.href);
        url.searchParams.set('id', this.tweetId.toString());
        url.searchParams.set('content', this.content);

        const res = await fetch(url, { method: 'POST' });
        const template = await parseDomFragment(res);
        const editedTweet = template.content.cloneNode(true /* deep */);
        this.replaceWith(editedTweet);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'my-editable-tweet': EditableTweet;
    }
}