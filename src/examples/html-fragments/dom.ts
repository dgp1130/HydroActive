// Repurposed from `html-fragments-demo`.
// https://github.com/dgp1130/html-fragments-demo/blob/main/client/dom.ts

// Chrome supports a (non-standard?) `includeShadowRoots` option on
// `DOMParser.parseFromString()`, add this to the type.
// https://web.dev/declarative-shadow-dom/#parser-only
type Parse = typeof DOMParser.prototype.parseFromString;
type RealDomParse = (
    this: DOMParser,
    ...args: Parameters<Parse> | [
        ...Parameters<Parse>,
        { includeShadowRoots?: boolean },
    ]
) => ReturnType<Parse>;

/**
 * Parse a network response as an HTML document fragment, then returns each
 * top-level element.
 */
export async function parseDomFragment(res: Response):
        Promise<HTMLTemplateElement> {
    // Parse a fully rendered document fragment from the network response.
    const html = await res.text();
    const contentType = res.headers.get('Content-Type');
    if (!contentType) throw new Error('Response has no Content-Type.');
    const simpleContentType = contentType.indexOf(';') === -1
        ? contentType
        : contentType.slice(0, contentType.indexOf(';'))
    ;

    // Parse the HTML, extract the top-level nodes, adopt them into the current
    // document, and fix the `<script />` tags.
    const parse = DOMParser.prototype.parseFromString as RealDomParse;
    const fragment = parse.apply(new DOMParser(), [
        html,
        simpleContentType as DOMParserSupportedType,
        { includeShadowRoots: true },
    ]);
    const adopted = document.adoptNode(fragment.body);
    replaceScripts(adopted);

    // Wrap everything in a template so it can be cloned as necessary.
    const template = document.createElement('template');
    template.content.append(...adopted.children);
    return template;
}

/**
 * Replace each `<script />` in the given element with a copy.
 * `DOMParser.parseFromString()` disables `<script />` tags. Cloning and
 * replacing each `<script />` tag means it will be loaded when attached to the
 * active document.
 * 
 * Also note that `<script />` tags should include `type="module"`, or else
 * multiple DOM fragments with the same `<script src="..."></script>` will fetch
 * and execute the resource multiple times on the same page. Module scripts have
 * a cache so multiple tags of the same resource won't duplicate execution.
 * 
 * @link https://www.w3.org/TR/DOM-Parsing/#:~:text=script%20elements%20get%20marked%20unexecutable%20and%20the%20contents%20of%20noscript%20get%20parsed%20as%20markup.
 * @link https://html.spec.whatwg.org/multipage/webappapis.html#fetch-a-classic-script
 * @link https://html.spec.whatwg.org/multipage/webappapis.html#fetch-a-single-module-script
 */
function replaceScripts(el: Element): void {
    for (const oldScript of Array.from(el.querySelectorAll('script'))) {
        const newScript = document.createElement('script');
        for (const name of oldScript.getAttributeNames()) {
            newScript.setAttribute(name, oldScript.getAttribute(name)!);
        }
        newScript.textContent = oldScript.textContent;

        oldScript.replaceWith(newScript);
    }
}