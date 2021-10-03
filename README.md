# joth
Javascript Object To HTML

## Usage

1. To be written

## Example

Assume "http://example.com/myJoth" returns the following XML:
```
    <?xml version="1.0"?>
    <j:stylesheet xmlns:j="http://blight.co/Transform">

        <j:main>
            <div>
                <j:text select="Hello {context.name}" />
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

<details><summary><h1>joth XML</h1></summary>

<details><summary><h2>Operations</h2></summary>

### j:call

Calls the named `j:function`. The current context will be passed, unless the call has a "select" attribute. All of the attributes
on the node will also be passed as "args". This also means you can't have your own arguments to a function being called "name" or
"select".

### j:call-foreach

This is the same as a `j:call` within a `j:foreach`. The context (current or "select" if available) must be an array, in which case the called function gets passed each element of the array, one at a time. If the context is not an array, or has no elements, the `j:else` 
branch will be followed if it exists.

### j:case

This is a case (or switch) statement that contains `j:when` nodes and optionally a `j:else` node. The tests on each `j:when` will be evaluated in sequence, and the first one that returns true will cause the sequence to stop. If none of the `j:when` nodes evaluate to
true, the `j:else` branch will be followed if it exists.

### j:else

This is an else clause for `j:call-foreach`, `j:case`, and `j:if`.

### j:function

Used for defining functions that are called using `j:call` or `j:call-foreach`. For example:
```
    <j:function name="myFunction">
```
All attributes on the call are considered to be arguments to the function, and are accessed within the funciton using "vars".

### j:if

Evaluates the "test" attribute, and if true, follows the content (excluding the optional `j:else`). If false, the `j:else` branch will
be followed if it exists.

### j:include

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

### j:text

Includes the content and optional "select" attribute as text. If both are present, the "select" attribute comes first. This is the
same behavior as `j:value-of`.

### j:value-of

This is identical to `j:text`.

### j:variables

Sets global variables based on the attributes on the node. Variables are accessed with "vars".
For example, assuming the context is `{ name: "Michael" }`:
```
    <j:variables country="Australia" message="Hello {name}" />
```
This variables would then be accessed using `{vars.country}` and `{vars.message}`.

### j:anythingelse

Anything unrecognised is ignored, including children of that node. Therefore you could put `j:comment` around code to comment it out.

</details>

<details><summary><h2>Parentheses</h2></summary>

Attributes containing the `{}` parentheses are interpreted as Javascript, which will have access to four properties: root; context; args; and vars.

- root is the top-level JSON object being parsed.
- context is the current JSON object being parsed. The "select" attribute on call nodes cause the context to change.
- args are all the attributes on any ancestor `j:call` or `j:call-foreach`. Nested calls will overwrite args of the same name, but 
not change the value in the higher call.
- vars are all the global variables set using `j:variable`.

The "args" and "vars" are accessed using dot notation. For example:
```
    <j:main>
        <j:call name="myFunction" myProperty="1" />
    </j:main>

    <j:function name="myFunction">
        <j:variables v1="myVariable1" v2="myVariable2" />
    </j:function>
```
At the point when the call is made and variable is set, the code will have access to `args.myProperty`, `vars.v1`, and `vars.v2`.
Note that the values will always be strings, so you may need to use `parseInt` if required.

Since the parentheses contain Javascript, you can include code. For example:
```
    <div class="mdc-card { (context.myThing=="1") ? 'my-class-1' : '' }>
```
Keep in mind that everything is a string - even non-existent attributes parse as an empty string. This allows you to include code such
as `{context.doesntExist.childProperty}` without having to worry that "doesntExist" might be undefined.
</details>

</details>

<details><summary><h1>To Do</h1></summary>

1. `j:else` is currently not built.
2. `j:text` and `j:value-of` probably don't currently include child text.
3. `j:foreach` probably needs to exist.
4. No browser has been tested other than Chrome.
5. No automated test cases yet.

</details>
