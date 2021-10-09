<details><summary><h2>Properties</h2></summary>

### Options

This is an object containing the properties below. An example is:
```
    j.options = { includeComments: true }
```
- `includeComments` will generate HTML comments for the start and end in the transformed output for all `j:` nodes. To help with
debugging.
- `debug` to write logs to the console if it is greater than 0. A value of 5 writes important details, 10 writes the most detail.

</detail>

<details><summary><h2>Methods</h2></summary>

### loadUrl(url)

Returns a Promise to load joth XML from the specified URL.

### loadString(s)

Loads joth XML from the specified string. Normally only useful for testing.

### toString(e, nsPrefix)

Converts the XML node, e, to a string. If e is null, it converts the whole joth XML. If e is not null, it also attempts to
remove the namespace that would otherwise be added if `nsPrefix` is supplied. Only really needed for error messages and debugging,
but included as 'public' regardless.

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

</detail>