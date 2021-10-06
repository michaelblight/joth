# joth
Javascript Object To HTML

## Rationale

In the late 90s early 2000s, I was creating web apps using XML and client-side transformation using MS-XSL and then XSLT for IE-only. It worked well, 
so why change it! JSON has overtaken popularity from XML, so this started as a proof-of-concept that things could be simpler than the 
Angular/React/Vue approaches.

In my view, libraries should do one small thing to help you on your way. They should not tell you how to organise your application. I've written frameworks 
before. It was a mistake.

## Usage

1. To be written

## Example

Assume "http://example.com/myJoth" returns the following XML:
```
    <?xml version="1.0"?>
    <j:stylesheet xmlns:j="http://blight.co/Transform">

        <j:main>
            <div>
                <j:text value="Hello {context.name}" />
            </div>
        </j:main>

    </j:stylesheet>
```

And "http://example.com/myData" returns the following JSON:
```
    { "name": "Michael" }
```

Then this is transformed using the following Javascript code:
```
	joth
		.load('http://example.com/myJoth')
		.then(() => j.transformUrl('http://example.com/myData'))
		.then((d) => {
			alert(d.innerHTML);
		})
		.catch((e) => {
			console.log(e);
		});
```
You can alternatively use `transformUrlTo` and pass an HTML DOM element or string id as the second parameter. This will replace it's contents with the transformation.

<details><summary><h1>joth Class</h1></summary>

<details><summary><h2>Properties</h2></summary>

### Options

This is an object containing the properties below. An example is:
```
    j.options = { includeComments: true }
```
- `includeComments` will generate HTML comments for the start and end in the transformed output for all `j:` nodes. To help with
debugging.
- `debug` to write logs to the console if it is greater than 0. A value of 5 writes important details, 10 writes the most detail.

</details>

<details><summary><h2>Methods</h2></summary>

### load(url)

Returns a Promise to load joth XML from the specified URL.

### loadString(s)

Loads joth XML from the specified string. Normally only useful for testing.

### toString(e, nsPrefix)

Converts the XML node, e, to a string. If e is null, it converts the whole joth XML. If e is not null, it also attempts to
remove the namespace that would otherwise be added if `nsPrefix` is supplied.

### transformJSON(json)

Perform the transformation using the supplied object and previously loaded joth XML.
The result is returned as a DIV element.

### transformUrl(url)

Returns a Promise to load JSON from the specified URL and perform the transformation using the previously loaded joth XML.
The result is returned as a DIV element in the resolve for the Promise.

### transformUrlTo(url, dest)

Returns a Promise to call `transformUrl(url)` and then clear the contents of `dest` and load the children of the returned DIV as
children under `dest`. If `dest` is a string, it is assumed to be the id of a document element. Otherwise it is assumed to be the
document element.

### _whatever()

These are all "private" methods and don't do anything useful outside the appropriate context.

</details>

</details>

<details><summary><h1>joth XML</h1></summary>

<details><summary><h2>Operations</h2></summary>

In the descriptions below:
- "attr" refers to an attribute value that can optionally contain parentheses to evaluate. Examples are `"static"`,
`"{context.myProperty}"` and `"test-{vars.number}"`.
- "eval" refers to an attribute value that is also evaluated as a whole. If it doesn't contain parentheses, and doesn't start with
"context.", "args.", "vars.", it will be prefixed with "context." automatically. This is to provide greater similarity to XSLT.
- square brackets [] indicate that an attribute is optional.

### j:call name="attr" [select="eval"] [ argName="attr" ...]

Calls the named `j:function`. The current context will be passed, unless the call has a "select" attribute. All of the attributes
on the node will also be passed as "args". This also means you can't have your own arguments to a function being called "name" or
"select". If "select" is used and it returns null, the call will not be made. Child nodes within this operation are ignored.

### j:call-foreach name="attr" [select="eval"] [ argName="attr" ...]

This is the same as a `j:call` within a `j:foreach`. The context (current or "select" if available) must be an array, in which case the called function gets passed each element of the array, one at a time. If the context is not an array, or has no elements, the `j:else` 
branch will be followed if it exists. If "select" is used and it returns null, the call will not be made. Child nodes within this operation are ignored.

### j:choose

This is a case (or switch) statement that contains `j:when` nodes and optionally a `j:else` node. The tests on each `j:when` will be evaluated in sequence, and the first one that returns true will cause the sequence to stop. If none of the `j:when` nodes evaluate to
true, the `j:else/j:otherwise` branch will be followed if it exists.

### j:else

This is an else clause for `j:call-foreach`, `j:case`, and `j:if`.

### j:function name="functionName"

Used for defining functions that are called using `j:call` or `j:call-foreach`. For example:
```
    <j:function name="myFunction">
```
All attributes on the call are considered to be arguments to the function, and are accessed within the funciton using "vars".

### j:foreach [select="eval"] [ argName="attr" ...]

The context (current or "select" if available) must be an array, in which case thechildren are processed one at a time. If the context is not an array, or has no elements, the `j:else` 
branch will be followed if it exists. If "select" is used and it returns null, the call will not be made.

### j:if test="eval"

Evaluates the "test" attribute, and if true, follows the content (excluding the optional `j:else`). If false, the `j:else` branch will
be followed if it exists.

### j:include href="url"

Used for including other joth xml files. These nodes must be a child of the `j:stylesheet` node. For example:
```
    <j:include href="../../Components/joth/materialdesign.xml" />
```

### j:main

The main part of the code that is executed. The process looks for this node beneath `j:stylesheet`. If multiple exist, only the last
will be used.

### j:stylesheet

This must be the root node of the document, and must have a namespace of "http://blight.co/Transform". 
The only children that will have any relevance are `j:main`, `j:include`, and `j:function`. Everything else will be ignored.

### j:text value="attr"

Includes the content and optional "value" attribute as text. If both are present, the "value" attribute comes first. The
following two operations would be equivalent:
```
    <j:text value="{context.myProperty}" />
    <j:value-of select="myProperty" />
```

### j:value-of select="eval"

Includes the content and optional "select" attribute as text. If both are present, the "value" attribute comes first.
If the "select" does not contain parentheses, it is automatically prefixed with "context.". If it does contain parentheses,
the content is first expanded, and then evaluated. For example, given a context of `{ a: 1, b: 2, field1: "John", field2: "Mary" }`:
```
    <j:value-of select="context.field{context.a}" />    - Produces "John"
    <j:text value="{a}+{b}" />                          - Produces "1+2"
    <j:value-of select="{a}+{b}" />                     - Produces "3"
```

### j:variable name="variableName" [ value="attr" ]

Sets one global variable based on the value attribute on the node as well as the content of the node. Also see `j:variables`.

### j:variables [variableName="attr" ...]

Sets global variables based on the attributes on the node. Variables are accessed with "vars".
For example, assuming the context is `{ name: "Michael" }`:
```
    <j:variables country="Australia" message="Hello {name}" />
```
These variables would then be accessed using `{vars.country}` and `{vars.message}`. The `j:variables` operation ignores any node content, whereas `j:variable` includes content. Use `j:variable` instead of `j:variables` when
you need more complex logic (eg. content including `j:if`).

### j:anythingelse

Anything unrecognised is ignored, including children of that node. Therefore you could put `j:comment` around code to comment it out.

</details>

<details><summary><h2>Context</h2></summary>

As with XSLT, there is the concept of a context, which starts at the root of the JSON (which can also always be accessed as `root`). Every time
a "select" is interpreted it changes the context. For example, with the following JSON:
```
    { person: { name: "Michael", address: { street: "1 Home Street", suburb: "Homely Meadows" }}}
```
The context will start at the top (ie. `context.person` exists). A select of "person.address" would change the context such that `context.street`
and `context.suburb` are available.

</details>

<details><summary><h2>Args</h2></summary>

All of the attributes on `j:call/j:call-foreach` are passed to the `j:function` as arguments (args). They can be referenced within the function as
`args.functionName`. There is one special argument called `$info` which is provided for `j:call-foreach`, which provides the following:

- `args.$info.position` is equivalent to `position()` in XSLT, and is the 1-based index into the for-each loop.
- `args.$info.count` is the total number of items to be looped by the for-each.
- `args.$info.isFirst` is true for the first loop item (ie. position = 1).
- `args.$info.isLast` is true for the last loop item (ie. position = count).

</details>

<details><summary><h2>Parentheses</h2></summary>

Attributes containing the `{}` parentheses are interpreted as Javascript, which will have access to four properties: root; context; args; and vars.

- root is the top-level JSON object being parsed.
- context is the current JSON object being parsed. The "select" attribute on call nodes cause the context to change.
- args are all the attributes on any ancestor `j:call` or `j:call-foreach`. Nested calls will overwrite args of the same name, but 
not change the value in the higher call.
- vars are all the global variables set using `j:variable`.

The "context", "args" and "vars" are accessed using dot notation. For example:
```
    <j:main>
        <j:call name="myFunction" myProperty="1" select="myObject" />
    </j:main>

    <j:function name="myFunction">
        <j:variables v1="myVariable1" v2="myVariable2" />
        <xsl:text value="{context.a} {args.myProperty} {vars.v1}" />
    </j:function>
```
At the point when the call is made and variable is set, the code will have access to `args.myProperty`, `vars.v1`, and `vars.v2`. Similarly, 
the "select" on the call changes the context to "myObject", so `context.a` is "myObject.a" in the JSON.

Since the parentheses contain Javascript, you can include code. For example:
```
    <div class="mdc-card { (context.myThing=="1") ? 'my-class-1' : '' }>
```
Note the following:

- Non-existent attributes parse as an empty string. This allows you to include code such
as `{context.doesntExist.childProperty}` without having to worry that "doesntExist" might be undefined.
- Parentheses cannot be nested. So instead of `{ part{index} }` you could do something like the following:
```
    <j:variables indexed="part{index}" />
    <j:text value="{indexed}" />
``` 
</details>

</details>

<details><summary><h1>To Do</h1></summary>

2. Do I need `j:attributes` and/or `j:attribute`?
4. No browser has been tested other than Chrome.
5. Only some semi-automated test cases so far.
6. Could the initial parse also find errors like imbalanced or nested parentheses?
7. Do I need `j:sort`?

</details>
