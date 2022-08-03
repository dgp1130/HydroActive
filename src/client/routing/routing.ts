import { parseDomFragment } from '../lib/dom.js';
import { Route, Router } from '../lib/router.js';

class MyRouter extends Router {
  protected override async route(route: Route): Promise<DocumentFragment> {
    const res = await fetch(`/routing/${route.hash.slice(1)}.html`);
    const template = await parseDomFragment(res);
    const frag = template.content.cloneNode(true /* deep */) as DocumentFragment;
    return frag;
  }
}

customElements.define('my-router', MyRouter);
