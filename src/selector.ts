// Forked from: https://twitter.com/develwoutacause/status/1532059485035868160?s=20&t=BQ49mTxnPbLelXgj7EAs-Q

// ---------------------
// IMPLEMENTATION
// ---------------------
//
// Parses the query string at compile time to extract the tag name, look up the element type, and return it.

export type QueriedElement<Query extends string, Host extends Element = Element> =
    Query extends ':host'
        ? Host
        : Union<ElementsOf<TagNames<Selectors<Query>>>>;

// Handling selector list is tricky. Split on comma and then parse each selector individually.
// The final result of all the possible element types are then Union-ed into a single type.
type Selectors<Query extends string> = Split<Query, ','>;
// Map input over TagName<T> type.
type TagNames<Selectors extends string[]> = Selectors extends []
    ? []
    : Selectors extends [infer Head, ...infer Tail]
        ? Head extends string
            ? Tail extends string[]
                ? [TagName<Head>, ...TagNames<Tail>]
                : never
            : never
        : never
;
// Map input over ElementOf<T> type.
type ElementsOf<TagNames extends (string|null)[]> = TagNames extends []
    ? []
    : TagNames extends [infer Head, ...infer Tail]
        ? Tail extends (string|null)[]
            ? Head extends string
                ? [ElementOf<Head>, ...ElementsOf<Tail>]
                : [Head, ...ElementsOf<Tail>] // Head could be `null` if a pseudo-element is in the query.
            : never
        : never
;
type ElementOf<TagName extends string> = TagName extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[TagName] : Element;

// Parse the tag name out of the given query. Returns `string` if the tag name could not be found (for cases like `.foo` or `*`).
type TagName<Query extends string> = ParseTagName<Query> extends ''
    ? string
    : ParseTagName<Query> extends '*'
        ? string
        : ParseTagName<Query>
;

type ParseTagName<Query extends string> = StripPseudoClasses<
    CheckPseudoElements<
        StripAttributes<
            StripClass<
                StripId<
                    TargetSelector<
                        Query
                    >
                >
            >
        >
    >
>;

// Parses all the combinators in a query and returns the selector that will be matched in the target.
type TargetSelector<Query extends string> = Combinators<Trim<Query>>;
type Combinators<Query extends string> = ColumnCombinator<
    AdjacentSiblingCombinator<
        GeneralSiblingCombinator<
            ChildCombinator<
                DescendentCombinator<
                    Query
                >
            >
        >
    >
>;
type ChildCombinator<Query extends string> = Last<Split<Query, '>'>>;
type DescendentCombinator<Query extends string> = Last<Split<Trim<Query>, ' '>>
type GeneralSiblingCombinator<Query extends string> = Last<Split<Trim<Query>, '~'>>
type AdjacentSiblingCombinator<Query extends string> = Last<Split<Trim<Query>, '+'>>
type ColumnCombinator<Query extends string> = Last<Split<Trim<Query>, '||'>>

type StripId<Selector extends string> = Split<Selector, '#'>[0];
type StripClass<Selector extends string> = Split<Selector, '.'>[0];
type StripAttributes<Selector extends string> = Split<Selector, '['>[0];
// `querySelector()` doesn't support pseudo elements (always returns `null`), detect this at compile-time by returning `null`.
type CheckPseudoElements<Selector extends string> = Selector extends `${infer _}::${infer _}`
    ? null
    : Selector
;
type StripPseudoClasses<Selector extends string | null> = Selector extends string ? Split<Selector, ':'>[0] : null;

// ---------------------
// UTILITIES
// ---------------------
//
// These don't implement any meaningful logic, they just provide some useful functionality for writing the implementation.

// Gets the last element in the provided list (or `never` if the list is empty).
type Last<Input extends unknown[]> = Input extends [...infer _, infer Final] ? Final : never;

// Trims the given string type.
type Trim<Input extends string> = TrimLeft<TrimRight<Input>>;
type TrimLeft<Input extends string> = Input extends ` ${infer Content}` ? TrimLeft<Content> : Input;
type TrimRight<Input extends string> = Input extends `${infer Content} ` ? TrimRight<Content> : Input;

// Splits/joins the input string by the provided delimiter recursively.
type Split<Input extends string, Delim extends string> = Input extends []
    ? []
    : Input extends `${infer First}${Delim}${infer Remaining}`
        ? [First, ...Split<Remaining, Delim>]
        : [Input]
;

// Converts the given array into a union type of all its components.
type Union<Input extends unknown[]> = Input extends []
    ? never
    : Input extends [infer Head, ...infer Tail]
        ? Head | Union<Tail>
        : Input
;
