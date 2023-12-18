/**
 * @fileoverview Implements {@link QueriedElement}, which resolves a static
 * selector string at build time and returns the type of the element referenced.
 */

/**
 * Resolves a selector query into the possible {@link Element} types it may
 * return.
 *
 * @param Query The selector query to resolve.
 * @param Host The host element making the query.
 * @returns A union of all possible {@link Element} objects which may be
 *     returned by the query.
 */
export type QueriedElement<
  Query extends string,
  Host extends Element = Element,
> = Query extends ':scope'
    ? Host
    : Union<ElementsOf<TagNames<Selectors<Query>>>>
;

// Handling selector list is tricky. Split on comma and then parse each selector
// individually. The final result of all the possible element types are then
// union-ed into a single type.
type Selectors<Query extends string> = Split<Query, ','>;

// Map input over TagName<T> type.
type TagNames<Selectors extends string[]> = Selectors extends []
    ? []
    : Selectors extends [ infer Head, ...infer Tail ]
        ? Head extends string
            ? Tail extends string[]
                ? [ TagName<Head>, ...TagNames<Tail> ]
                : never
            : never
        : never
;

// Parse the tag name out of the given query. Returns `string` if the tag name
// could not be found (for cases like `.foo` or `*`).
type TagName<Query extends string> = ParseTagName<Query> extends ''
    ? string
    : ParseTagName<Query> extends '*'
        ? string
        : ParseTagName<Query>
;

// Map input over ElementOf<T> type.
type ElementsOf<TagNames extends Array<string | null>> = TagNames extends []
    ? []
    : TagNames extends [ infer Head, ...infer Tail ]
        ? Tail extends Array<string | null>
            ? Head extends string
                ? [ ElementOf<Head>, ...ElementsOf<Tail> ]
                // Head could be `null` if a pseudo-element is in the query.
                : [ Head, ...ElementsOf<Tail> ]
            : never
        : never
;

type ElementOf<TagName extends string> =
    TagName extends keyof HTMLElementTagNameMap
        ? HTMLElementTagNameMap[TagName]
        : Element
;

type ParseTagName<Query extends string> =
    StripPseudoClasses<
        CheckPseudoElements<
            StripAttributes<
                StripClass<
                    StripId<
                        TargetSelector<
                            TrimEquals<
                                TrimAttributes<
                                    Query
                                >
                            >
                        >
                    >
                >
            >
        >
    >
;

// `[ foo=bar ]` is a valid selector, but splitting selectors on ` ` would
// accidentally break a `div span[ foo=bar ]` into
// `[ "div", "span[", "foo=bar", "]" ]`, which is incorrect. To address this, we
// fixup the input query by trimming unnecessary spaces inside an attribute
// selector. This converts `[ foo=bar ]` into `[foo=bar]`.
type TrimAttributes<Query extends string> =
    TrimAttributesRight<TrimAttributesLeft<Query>>
;
type TrimAttributesLeft<Query extends string> =
    Query extends `${infer First}[ ${infer Second}`
        ? TrimAttributes<`${First}[${Second}`>
        : Query
;
type TrimAttributesRight<Query extends string> =
    Query extends `${infer First} ]${infer Second}`
        ? TrimAttributes<`${First}]${Second}`>
        : Query
;

// `[foo = bar]` is a valid selector, but splitting selectors on ` ` would
// accidentally break a `div span[foo = bar]` into
// `[ "div", "span[foo", "=", "bar]" ]`, which is incorrect. To address this, we
// fixup the input query by trimming unnecessary spaces around an equals
// operator. This converts `[foo = bar]` into `[foo=bar]`.
type TrimEquals<Query extends string> = TrimEqualsRight<TrimEqualsLeft<Query>>;
type TrimEqualsLeft<Query extends string> =
    Query extends `${infer First} =${infer Second}`
        ? TrimEqualsLeft<`${First}=${Second}`>
        : Query
;
type TrimEqualsRight<Query extends string> =
    Query extends `${infer First}= ${infer Second}`
        ? TrimEqualsRight<`${First}=${Second}`>
        : Query
;

// Parses all the combinators in a query and returns the selector that will be
// matched in the target.
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
type GeneralSiblingCombinator<Query extends string> =
    Last<Split<Trim<Query>, '~'>>
type AdjacentSiblingCombinator<Query extends string> =
    Last<Split<Trim<Query>, '+'>>
type ColumnCombinator<Query extends string> = Last<Split<Trim<Query>, '||'>>

type StripId<Selector extends string> = Split<Selector, '#'>[0];
type StripClass<Selector extends string> = Split<Selector, '.'>[0];
type StripAttributes<Selector extends string> = Split<Selector, '['>[0];

// `querySelector()` doesn't support pseudo elements (always returns `null`),
// detect this at compile-time by returning `null`.
type CheckPseudoElements<Selector extends string> =
    Selector extends `${string}::${string}`
        ? null
        : Selector
;
type StripPseudoClasses<Selector extends string | null> =
    Selector extends string
        ? Split<Selector, ':'>[0]
        : null
;

// Gets the last element in the provided list (or `never` if the list is empty).
type Last<Input extends unknown[]> = Input extends [...infer _, infer Final]
    ? Final
    : never
;

// Trims the given string type.
type Trim<Input extends string> = TrimLeft<TrimRight<Input>>;
type TrimLeft<Input extends string> = Input extends ` ${infer Content}`
    ? TrimLeft<Content>
    : Input
;
type TrimRight<Input extends string> = Input extends `${infer Content} `
    ? TrimRight<Content>
    : Input
;

// Splits the input string by the provided delimiter recursively.
type Split<Input extends string, Delim extends string> =
    Input extends `${infer First}${Delim}${infer Remaining}`
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
