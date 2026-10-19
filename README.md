# DOM Localization

Stage: 1  
Author: [Eemeli Aro](https://github.com/eemeli)  
Previous authors: [Zibi Braniecki](https://github.com/zbraniecki) and [Erik Nordin](https://github.com/nordzilla)

Presentations:

- [2026 Web Engines Hackfest](https://docs.google.com/presentation/d/11jlGRSi_G0BvBN93pb62NdxEc_6TBuRRWT_aS3tmev0/edit?usp=sharing)
- [2025 TPAC Breakout Session](https://docs.google.com/presentation/d/1ON2yeocyDSVr8r0cg8ZlhgpFfsvloznq1pJqYSADJs8/edit?usp=sharing)
- [2023 TPAC Breakout Session](https://docs.google.com/presentation/d/1cvvNcC2jMKztYKFIAg1Q5JPWrMCd0q8Ac2m7P1RYhOc/edit?usp=sharing)

Users of the web are best served by being able to experience it in their native languages.
Currently, localization of web content is achieved with a multitude of custom solutions,
most of which are unable to express the full depth and breadth of human expressions in all languages.
Introducing an easy-to-use but powerful standard localization solution would improve
the experience of all users, in particular the vast majority who do not speak English natively.

Most localizable content is composed of simple strings,
and most of the content that has some dependency on input variables only uses them as unmodified placeholders.
This has lead to most localization systems having been built up iteratively,
only conservatively adding new features when the need for them has been identified.
Many localization systems used on the web do not support any variance in message patterns,
and the ones that do almost all limit that variance to plurals,
i.e. allowing for patterns like "1 thing" and "3 things" to be separately expressed.

Defining a holistic and complete standard solution for the localization of the web
would allow for developers to not need to pick from a number of less capable localization systems,
and for existing libraries and frameworks to start using the standard solution internally.

## Methodology for approaching & evaluating solutions

This proposal seeks to directly address the concerns raised in the
[Internationalization section of Mozilla's Web Vision](https://www.mozilla.org/en-US/about/webvision/full/#internationalization),
and is in fact directly referenced there:

> For sites which have the resources to invest in localization, we need technology that enables that. Traditionally, translation was accomplished by simply translating blocks of text. Today's rich Web applications can be very dynamic, and thus require substantially more nuance in order to handle genders, multiple nested plural categories, declensions, and other grammatical features which differ across languages and dialects. Moreover, the experience of generating localizations and applying them to sites is error-prone and cumbersome. We want it to be as easy and flexible to localize a site as it is to style it with CSS. Over the past decade we’ve built such a system for Firefox, called Fluent. Beyond localizing Firefox, we’re working with others to bring the ideas and technology behind Fluent to other client-side software projects with the ICU4X Rust library and to the Web with the Unicode Consortium's MessageFormat Working Group. Together with a new proposal for _**DOM localization**_, we see a much more powerful story for localizing Web Sites on the horizon.

Furthermore, when considering what sort of solution is appropriate,
we can help strive towards [The Declarative Web](https://www.mozilla.org/en-US/about/webvision/full/#thedeclarativeweb):

> The Web’s basic design is declarative: HTML and CSS have empowered a very wide range of people to develop Web content because they’re easy to understand and allow site authors to focus on the _what_ rather than the _how_. In addition, browser-provided declarative features can guarantee robust & predictable fallback behaviors, in contrast to more fragile imperative approaches, where the responsibility for error handling falls entirely on the developers. Unfortunately, while Web experiences have become substantially more rich over the past 20 years, the expressiveness of HTML and CSS has not kept pace. Instead, authors who want to build interactive applications usually build upon frameworks that then draw their interfaces using HTML but use JavaScript for the heavy lifting of application and rendering logic. For complicated applications, this is a reasonable choice, but the limited HTML/CSS feature set means that authors feel compelled to use larger and increasingly more complex JS libraries & frameworks for nearly any interactive site. In a better world, it would be possible to build more of these experiences using only the capabilities built into the browser.

## Prior proposals that attempt to solve the problem

Previous attempts to add localization support to the web have been focused on its support in JavaScript, as `Intl.MessageFormat`.
This was [first considered](https://web.archive.org/web/20160802003122/http://wiki.ecmascript.org/doku.php?id=globalization:messageformatting) in 2013,
then [briefly discussed](https://github.com/tc39/ecma402/issues/92) again in 2016,
until a [more concerted effort](https://github.com/tc39/ecma402/blob/main/meetings/notes-2019-06-13.md#intlmessageformat) was made to start the actual work,
which became the [MessageFormat Working Group](https://github.com/unicode-org/message-format-wg) under the Unicode CLDR-TC in 2020.

The main reason why earlier efforts here failed to proceed was a general agreement that the available message formats were insufficient.
This has meant that the MessageFormat WG has thus far focused its work on defining
the [Unicode MessageFormat Standard](https://www.unicode.org/reports/tr35/tr35-messageFormat.html),
which is now (since March 2025) a stable part of Unicode's LDML specification.
Thus far, implementations of Unicode MessageFormat are available in Unicode's ICU4C and ICU4J libraries,
as well as the [`messageformat`](https://www.npmjs.com/package/messageformat) JavaScript package.

The JavaScript implementation of Unicode MessageFormat is tracked as
the TC39 [Intl.MessageFormat proposal](https://github.com/tc39/proposal-intl-messageformat).

A [prior version of this DOM localization proposal](https://nordzilla.github.io/dom-l10n-draft-spec/)
was authored by Zibi Braniecki and Erik Nordin,
drawing heavily from experiences in developing, maintaining, and using [Fluent](https://projectfluent.org/),
Mozilla's localization system for natural-sounding translations.
Fluent has also been a significant source of inspiration and experience in the design of Unicode MessageFormat.

The [Fluent DOM Overlays rev 3](<https://github.com/zbraniecki/fluent-domoverlays-js/wiki/New-Features-(rev-3)>) document
identifies and enumerates a number of proposed changes to Mozilla's DOM localization system
that are incorporated in this proposal.

The [DOM Parts proposal](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/DOM-Parts.md)
has some overlap with its aim to enable similar updates to element contents and attributes,
but does not consider localization as one of its use cases.
It also does not provide a mechanism by which locale-specific resources could be loaded.

## Limitations in existing proposals

If we were to not consider DOM localization,
we would leave the standard capability of localizing the web to be a JavaScript feature only.

A number of JavaScript frameworks and libraries for localization exist,
including [one for Unicode MessageFormat](https://www.npmjs.com/package/messageformat).
However, all such solutions -- including the proposed `Intl.MessageFormat` for JavaScript --
require localization to be achieved by extra steps and complications that ought not be necessary.

## Motivation for this explainer

To quote again from [Mozilla's Web Vision](https://www.mozilla.org/en-US/about/webvision/full/#internationalization):

> We want it to be as easy and flexible to localize a site as it is to style it with CSS.

By incorporating localization as a core capability of the web,
we can make it available for everyone.

Through our years of experience in using a Fluent-based variant of DOM localization
in Firefox, Thunderbird, and many other Mozilla products,
we've managed to gain some confidence in the strengths and capabilities of such a solution,
along with finding some pitfalls that a standard solution should avoid.

The composition of HTML, DOM, CSS, and JavaScript and related technologies
is commonly used to create applications with both content and user interface.
One of the core value propositions provided by this stack of technologies is their open, semantic and pluggable nature.

For example, CSS provides technology to apply styles and themes to HTML Documents,
but also enables web browsers and third-party addons such as extensions or accessibility tools
to adjust the styles and themes at runtime.

In a similar way, DOM localization proposes to introduce a localization component to this stack.
This component would allow for HTML documents to be localized in a way that enables web browsers and third-party extensions
to augment documents for the benfit of the user's experience.
Such an open system would allow for construction of localizable web applications that can be introspected for semantic information,
be augmented by external code for different forms of presentation (screen readers, VR etc.),
and be accessible to the global audience.

## Outline of a proposed solution

We propose to introduce a notion of a _**localization context**_,
similar to JavaScript document context, or CSS stylesheets,
which would be composed of a list of _localization resources_ declared in the `<head>` of the document.

A _**localization resource**_ is a file that contains
_**messages**_ that are defined using [Unicode MessageFormat](https://www.unicode.org/reports/tr35/tr35-messageFormat.html).
Similar to stylesheets, developers will be able to programmatically construct any number of _localization resources_,
as well as declaratively define them for HTML documents, shadow DOM trees etc.

Within a _localization context_, each _message_ is identified and referenced with a _**message identifier**_.
The _messages_ would then be used to localize DOM elements or fragments.

The mechanism to resolve _localization resources_ is nontrivial
and will require a significant amount of up-front design.
The main aspect of the mechanism is that it has to enable the engine to reason about the locales that the user or app requested,
and the locales in which _localization resources_ are available.
It must be able to negotiate between these two sets
to provide an optimal solution for formatting _messages_ in the given _localization context_.

We propose to introduce a set of (potentially namespaced) core attributes to HTML that would allow developers to
declaratively or programmatically bind DOM elements and fragments to localization _messages_.
In addition to a _message identifier_ reference,
we would also add an attribute for defining _**localization arguments**_
as a set of key-value pairs that serve as arguments when formatting a _message_.

When an element includes a _message identifier_ reference as an attribute,
its contents and/or other [translatable attribute](https://html.spec.whatwg.org/multipage/dom.html#translatable-attributes) values
are replaced with the corresponding _message's_ formatted results.

In order for the system to be accessible programmatically,
a JavaScript API for the _localization context_ is included in the proposal.
This would be an abstraction built upon the
[Intl.MessageFormat](https://github.com/tc39/proposal-intl-messageformat) object.

We propose that it should be possible for translated _messages_
to refer to or contain DOM elements within the _message_ itself.
For example, a localized _message_ in one locale might like to add `<b>` elements
in appropriate places to make the text bold,
or a _message_ might include a `<button>` or `<a>` link
with some attributes or beahviour defined in HTML or JavaScript.
This is a delicate and nuanced situation that requires heavy scrutiny,
since inserting arbitrary HTML can pose many security risks.

As Unicode MessageFormat only defines the syntax, formatting, and other operations of a single message,
work on DOM localization requires that a web-compatible _message resource_ file format is also defined.
A purpose-built file format enables for Unicode MessageFormat messages to be represented in an easy-to-edit format,
which is not the case when they are e.g. embedded in a JSON document,
and it enables the systematic representation of comments and metadata that is essential for translation work.

Work on _message resources_ is currently being incubated at the W3C i18n WG,
with a [strawman proposal](https://github.com/w3c/i18n-discuss/blob/gh-pages/explainers/message-resources.md) of what such a format could look like,
along with more detailed discussion of why existing file formats are not sufficient.

### Examples and Sample Code

> Note: The following examples include strawman proposals for the additions to HTML, JavaScript,
> and for the _message resource_ file format.
> However, the syntax of a _message_ value is well defined by Unicode MessageFormat.

_Localization resources_ declared in the `<head>` element of a document are aggregated into a _localization context_ that is scoped to that document.

```html
<html>
  <head>
    <link rel="messages" href="uri/for/resource.msg" />
  </head>
  <body>
    <h1 msg="greeting" msg-username="John"></h1>
  </body>
</html>
```

If we assume that the resolved _localization resource_ contains a _message_ such as:

```ini
greeting = Welcome, {$username}.
```

Then the above example would produce a DOM matching the following representation after localization:

```html
<html>
  <head>
    <link rel="messages" href="uri/for/resource.msg" />
  </head>
  <body>
    <h1 msg="greeting" msg-username="John">Welcome, John</h1>
  </body>
</html>
```

It should also be possible to define the _localization resource_ directly within the HTML document:

```html
<html>
  <head>
    <script type="messages">
      greeting = Welcome, {$username}.
    </script>
  </head>
  <body>
    <h1 msg="greeting" msg-username="John"></h1>
  </body>
</html>
```

### JS API

Continuing with the same example, changing the header contents would be possible with:

```js
let h1 = document.querySelector("h1");
h1.l10n.set("greeting", { username: "Mary" });
```

The formatted title would also be accessible directly in JavaScript:

```js
let msg = document.l10n.getMessage("greeting").format({ username: "Mary" });
```

### Attribute Localization

The localization of [translatable](https://html.spec.whatwg.org/multipage/dom.html#translatable-attributes) element attributes is made possible with:

```html
<html>
  <body>
    <button msg="ok-button"></button>
  </body>
</html>
```

```ini
ok-button = Click me
ok-button.title = Title to show on hover
ok-button.aria-label = Main button
```

Producing the following DOM after localization:

```html
<html>
  <body>
    <button
      msg="ok-button"
      title="Title to show on hover"
      aria-label="Main button"
    >
      Click me
    </button>
  </body>
</html>
```

Such atomic binding between a UI widget and a composed localization unit
would be particularly useful for localization of Web Components
where rich set of attributes could be used to carry localization _messages_
across the boundary from the document to shadow DOM.

This binding would also enable locale consistency for the whole UI element
ensuring that content and attributes of each element are localized into the same locale,
be it the primary locale, or any fallback locale.

### DOM Overlays

#### Text-level Elements

_Messages_ should be able to include [text-level elements](https://html.spec.whatwg.org/multipage/text-level-semantics.html)
that would be included in the localized results.
For example, a developer may create a paragraph element such as the following.

```html
<p msg="key1">Message to be localized.</p>
```

A translator should be able to provide a translation that contains text-level elements if desired.

```ini
key1 = This is {#em}my{/em} localized message.
```

At which point, the final localized DOM would be equivalent to the following,
in which the `<em>` element is interpreted correctly as HTML and rendered accordingly.

```html
<p msg="key1">This is <em>my</em> localized message.</p>
```

#### Functional Elements

Functional elements such as `<img>` and `<a>` may have attributes for which the developer
desires a translator to provide localized translations.

For example, a developer may provide an `<img>` with a `src` attribute.

```html
<p msg="key2">Hi, <img src="world.png" /></p>
```

A translator should be able to provide an `alt` attribute for the `<img>` element.

```ini
key2 = Hello, {#img alt=|world|}!
```

The above example would produce the following DOM after localization:

```html
<p msg="key2">Hello, <img src="world.png" alt="world" />!</p>
```

This example allows the translator to add the `alt` attribute unconstrained,
but it will likely be important to design syntax such that the translator can only add or modify
a localized attribute if it is explicitly requested by the developer.
This would ensure that the translator cannot override an attribute
that is not meant to be localized, such as `src` or `href`,
unless the translator has explicit permission to do so.

#### Structural Elements

A developer may want to have `<ul>` or `<ol>` elements be part of the localization,
in which the translator can then add `<li>` elements.

```html
<div msg="key3">
  <ul></ul>
</div>
```

A translator should then be able to provide a localized message along with list items.

```properties
key3 = This is a localized list:
  {#ul}
    {#li}Localized item 1{/li}
    {#li}Localized item 2{/li}
    {#li}Localized item 3{/li}
  {/ul}
```

The above example would produce the following DOM after localization:

```html
<div msg="key3">
  This is a localized list:
  <ul>
    <li>Localized item 1</li>
    <li>Localized item 2</li>
    <li>Localized item 3</li>
  </ul>
</div>
```

### Resource Loading and Content Negotiation

It should be possible for DOM Localization to support live language switching,
as well as supporting the localization of a page where
different localized elements have different languages.
This would allow for a localized experience to be provided using a single static HTML,
combined with multiple separate _message resources_, for each supported locale.

To effect this, the [language](https://html.spec.whatwg.org/#language)
of each element with a `msg` attribute
is taken into account when resolving `<link rel=messages>` references.
Note that this language is set by e.g. `lang` attributes on parent elements,
and is often different from the `navigator.language` value.

To ensure that a server is able to incorporate the language in the content negotiation it performs,
the [Accept-Language] header value will need to be set differently than usual
when resolving `<link rel=messages>` references.
It may be much more specific than usual, as its values can be set by the page
rather than being determined from user preferences.

[Accept-Language]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept-Language

#### Link Attributes

In order to account for servers that are not able to make use of Accept-Language,
as well as usage with `file:` and otherwise,
additional attributes beyond `href` will be required on `<link rel=messages>`:

- `hreftemplate`: An alternative to the `href` value,
  which would contain an [URL Pattern](https://urlpattern.spec.whatwg.org/) value.
  This would be used as a template together with the locale identifier
  to put together a corresponging URL value.

- `langavailable`: A set of space-separated locale identifiers
  that are available for the page's localization.
  This enables client-side language negotiation,
  which may reduce fingerprinting.
  If not set, the preferred locale and its fallback chain
  are set directly by the element's language. 

- `langfallback`: A single locale identifier to use as the ultimate fallback.
  By default, this would be the root or unknown locale,
  often represented as `und` or the empty string.

A `<link rel=message>` would need to have either an `href` or `hreftemplate` attribute,
but never both.

In an `hreftemplate` value, only the following placeholders would be available:

- `:lang`: The complete locale identifier in its original spelling
- `:lang_lang`: The language subtag of the canonicalized locale identifier
- `:lang_script`: The script subtag of the canonicalized locale identifier
- `:lang_region`: The region subtag of the canonicalized locale identifier

A placeholder may be delimited as `{:lang}` to distinguish it from trailing word characters.

Except for `:lang`, the locale identifier values are canonicalized and maximised,
so e.g. starting with `'ar-ae-u-nu-latn'` we end up with:

```js
{ lang: 'ar-ae-u-nu-latn', lang_lang: 'ar', lang_script: 'Arab', lang_region: 'AE' }
```

Note the capitalization changes in `lang_region`,
and the determination of `lang_script` from the language & region.
The canonicalization may also change a deprecated subtag
to its Preferred-Value in the subtag registry. 
For example, the language subtag, as e.g. `iw` canonicalises as `he`.

This could be used for instance as

```html
<link rel="messages" hreftemplate="/locale/{:lang_lang}_{:lang_region}.msg" />
```

Using any other placeholder than the above is an error,
though we could consider also supporting e.g. `:lang_canon`, `:lang_min`, `:lang_max`
to provide the canonical (e.g. `ar-eg` → `ar-EG`), minimised (`ar-eg` → `ar`),
and maximised (`ar-eg` → `ar-Arab-EG`) representations of the locale identifier.

#### Locale Fallback

A request for a message resource file
should follow the fallback chain of locales until something other than a 404 is received.
The default fallback chain would be:

1. The lang, as given (e.g. `ar-Arab-AE-u-nu-Latn`).
2. The lang, with subtags removed one at at time from the end,
   while taking any [BCP 47 Suppress-Script] fields into account (`ar-Arab-AE`, `ar-AE`, `ar`).
3. The root locale, `und`.
   Note that this currently maximizes to `en-Latn-US`,
   so its `:lang_lang` value would be `en` while its `:lang` value would be `und`.

[BCP 47 Suppress-Script]: https://www.rfc-editor.org/info/rfc5646/#section-3.1.9

If templating results in the same URL more than once, those are deduplicated.

Following the CLDR parent chain would not be supported,
so for `en-GB` we'd not try `en-150` and `en-001` before falling back to `en`,
or fall back from `hi-Latn` to `en-IN`.
These relationships are liable to change at any time, and are very difficult to reason about.

To customize and limit the locale resolution,
a `<link rel=messages>` may have a `langavailable` attribute,
which should contain a space-separated list of locale identifiers
that should be allowed as lang values.
For example, with

```html
<link
  rel="messages"
  hreftemplate="/locale/:lang/common.msg"
  langavailable="ar ar-ae fr it"
/>
```

the locales to try from the example above would be filtered
only to the available locales that are supersets of the requested or fallback locale,
and then mapped to the strictest matching available locale.
In this case, starting with `ar-Arab-AE-u-nu-Latn` we'd end up with the following URLs to try:

1. `/locale/ar-ae/common.msg` (from `ar-Arab-AE-u-nu-Latn`, `ar-Arab-AE`, and `ar-AE`)
2. `/locale/ar/common.msg`

If the `langavailable` attribute were not set,
the following URLs would be attempted instead:

1. `/locale/ar-Arab-AE-u-nu-Latn/common.msg`
2. `/locale/ar-Arab-AE/common.msg`
3. `/locale/ar-AE/common.msg`
4. `/locale/ar/common.msg`
5. `/locale/und/common.msg`

To customize the ultimate fallback value from its `und` default,
the `langfallback` attribute may be set.
With

```html
<link
  rel="messages"
  hreftemplate="/locale/:lang/common.msg"
  langavailable="ar ar-ae fr it"
  langfallback="it"
/>
```

the lookup chain from `ar-Arab-AE-u-nu-Latn` would end up as:

1. `/locale/ar-ae/common.msg`
2. `/locale/ar/common.msg`
3. `/locale/it/common.msg`

#### Accept-Language

For message resource requests,
the `Accept-Language` HTTP header should always be set by the language of the element,
i.e. _not_ the same value as the page itself was requested with.
When we're processing a `<link rel=message>`,
content negotiation between the client and the server has already occurred for the page,
and we're now within that page's context.

The header value should always use the same sequence of locale identifiers
as used for `hreftemplate`,
though with its catchall `*` being used by default as the ultimate fallback locale
rather than `und`.

Within the page, if we end up with e.g.

```html
<html lang="fr">
  <head>
    <link
      rel="messages"
      href="/locale/common.msg"
      langavailable="ar ar-ae fr it"
    />
    ...
    <body>
      <div lang="ar-Arab-AE-u-nu-Latn">
        <span msg="some-message"></span>
      </div>
    </body>
  </head>
</html>
```

then the request we generate should end up as something like

```
GET /locale/common.msg HTTP/1.1
...
Accept-Language: ar-ae, ar;q=0.9
```

Note that here we're using `href` rather than `hreftemplate`,
but still making use of `langavailable`.
Without that attribute, the request would end up as:

```
GET /locale/common.msg HTTP/1.1
...
Accept-Language: ar-Arab-AE-u-nu-Latn, ar-Arab-AE;q=0.9, ar-Arab;q=0.8, ar;q=0.7, *;q=0.6
```

This is a much more detailed value than usual,
but that's possible here because it's set based on values in the page,
and not from user preferences.

In this context, the final `und` maps quite naturally to the field's `*` wildcard,
which is left out from the `langavailable` -filtered request
as the page itself is declaring that the listed locales _are_ available.

With `hreftemplate` and a templated URL that with its fallback chain ends up with more than one URL to try,
the `Accept-Language` header would be the same for all of them.

#### Render Blocking and Incomplete Localizations

Given the capabilities for setting, mapping and filtering the locale identifier that are provided,
a client should not need to to request more than one message resource at a time per `<link rel=messages>`.

For the same reason, render blocking should only be required for the first request.
This does allow for the possibility of a "flash of unlocalized content",
but this can be avoided by appropriate use of templating,
`langavailable` filtering and mapping,
and/or serverside content negotiation.

More than one request is required when a localization is incomplete,
and does not contain all of the expected messages.
This is most often due to a translation not being up-to-date,
but it may also be intentional: for example,
a `fr-CH` localization could be a thin layer
changing only a few messages on top of a `fr` localization.
Avoiding a flash of unlocalized content for these cases would require one of the following:

1. Build-time tooling
   that layers the source message data appropriately into a single message resource.
   This is only really applicable when the locales share the same language,
   or at the very least use the same pluralisation rules.
2. Client (and server) support for a new multipart media type
   that could include multiple message resources in a single response.
3. Locale layering being a feature supported by the message resource syntax.
   At the moment, a message resource declares a single locale for all its contents,
   but this could theoretically be extended as:

   ```
   @locale en
   ---
   one = [First message in English]
   two = [Second message in English]
   three = [Third message in English]
   four = [Fourth message in English]
   ...
   @locale fr
   ---
   two = [Second message in French]
   three = [Third message in French]
   ...
   @locale fr-CH
   ---
   one = [First message in Swiss French]
   two = [Second message in Swiss French]
   ```

   Where the `...` document separator is introduced,
   borrowing again from YAML as was done for the `---` header separator.
   Applying messages from this resource would use
   `fr-CH` for `one` and `two`, `fr` for `three`, and `en` for `four`
   (message definitions in later parts override earlier ones).

   Adding such support to the format would be a bit of a crutch, though,
   as this functionality wouldn't really ever be used by humans who work with the files,
   but only as a build-process output.

Fallback between locales for individual messages ought to be considered as a form of exception handling.
With that viewpoint, having a first render get updated with a second one
after the fallback locale's messages are fetched is acceptable.

### Language Switching

As a part of this work, or in parallel with it,
it would be useful to explore whether and how a browser could provide a UI for language switching.
Already now browsers detect when a page is in a different language than the user's preference,
and offer to provide a machine translation of it,
or even do so automatically.

If a page itself advertises e.g. via `<link rel="messages" langavailable>`
that its localization is available in a set of languages,
these could and should be preferred over machine translation.

## Caveats and Shortcomings, and other drawbacks of design choices, both current and any prior iterations

### Resource Loading May be Slow

_Localization resources_ that are loaded from external files will need to be processed asynchronously.
This means that document rendering could experience a "flash of unlocalized content",
much like a [flash of unstyled content](https://en.wikipedia.org/wiki/Flash_of_unstyled_content).
This will need to be similarly addressed,
and the page's first render blocked until the message resources are available.

### Fallback Behaviour Needs Consideration

As localization can only be done after a _message_ is first defined for the source language,
it's quite common for a document to need to be rendered when no appropriate translation of a _message_ is available.
It should therefore be possible for the fallback order of localizations to be well defined.
This fallbacking can at times be a multi-stage process, such as `fr-CH, fr, en`,
where a Swiss French localization may rely on _messages_ from a generic French localization
before falling back to an English localization.

The DOM localization system used for Firefox allows for the need to perform fallback to be determined relatively late,
when attempting for format a _message_ that may not be available in the preferred locale.
This capability requires being able to load new _localization resources_ before completing the formatting,
which makes each formatting call asynchronous.

It may be preferable to leave locale fallback out of the capabilities of DOM localization,
and to only ensure that interfaces are provided that make it possible to implement with JavaScript.

### Localizable Attributes May Need to be Defined Explicitly

Regarding the localization of attributes either directly or via DOM overlays,
we may want to adopt an opt-in-only model in which a developer
must explicitly list which attributes should be localizable,
rather than making all [translatable attributes](https://html.spec.whatwg.org/multipage/dom.html#translatable-attributes) localizable by default.

For example, in the following example,
`alt` is the only attribute that localizers would be able to modify in translation:

```html
<p msg="key2" msgattrs="alt">Hi, <img src="world.png" /></p>
```

### Element Identify Should be Retained

Elements should not be recreated during localization.
If applying a localization were to effectively set the `innerHTML` of an element,
the identities of all elements would change, and e.g. all event handlers would be lost.

A [JavaScript PoC](https://github.com/zbraniecki/fluent-domoverlays-js/blob/1a023e0268d5afe121ccad1a5683037ff2c488d4/src/index.js#L74-L150)
of an algorithm applying a DOM overlay localization while retaining identity is available,
but the details of this will need further iteration as details of the proposal evolve.

For example, even after multiple retranslations,
the identity of the following `<button>` element should be the same:

```html
<div msg="submit-form">
  <button id="submit">Submit</button>
</div>
```

```properties
submit_form = {#button}Submit{/button}
```
