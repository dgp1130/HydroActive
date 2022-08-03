import './editable-tweet.js';

import { attr, HydratableElement, hydrate } from '../lib/hydrator.js';

class Tweet extends HydratableElement {
    @hydrate(':host', Number, attr('tweet-id'))
    private tweetId!: number;

    @hydrate('span', String)
    private content!: string;

    protected override hydrate(): void {
        this.bind('button', 'click', () => {
            const editableTweet = document.createElement('my-editable-tweet');
            editableTweet.tweetId = this.tweetId;
            editableTweet.content = this.content;
            this.replaceWith(editableTweet);
        });
    }
}

customElements.define('my-tweet', Tweet);

declare global {
    interface HTMLElementTagNameMap {
        'my-tweet': Tweet;
    }
}
