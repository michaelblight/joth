# joth
Javascript Object To HTML

## Usage

1. To use client-side, include the following in the HEAD section of your HTML:
```
    <script src="https://combinatronics.com/michaelblight/joth/main/joth.js"></script>
```
2. You can also run the tests included [here](https://combinatronics.com/michaelblight/joth/main/test/test.html).

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
    var j = new joth();
	j
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

[**Frequently Asked Questions**](https://github.com/michaelblight/joth/blob/main/support/FAQ.md)

[**joth Class Documentation**](https://github.com/michaelblight/joth/blob/main/support/FAQ.md)

[**joth XML Documentation**](https://github.com/michaelblight/joth/blob/main/support/FAQ.md)

<details><summary><h1>To Do</h1></summary>

2. Do I need `j:attributes` and/or `j:attribute`?
3. Server-side use in node.
4. Not yet tested on Safari.
5. Only some semi-automated test cases so far.
6. Could the initial parse also find errors like imbalanced or nested parentheses?
7. Do I need `j:sort`?

</details>
