var appServer = "http://192.168.0.18:1887/"
var j = new joth();
var results = null;

function pageLoaded() {
	results = document.getElementById('Results');
	j.options = { debug: 0, includeComment: false }
	j
		.load('test.xml')
		.then(() => {
			var test1 = j.transformJSON({ test1: { p1: '1.1 ', p2: '1.2 ', p3: '1.3 ', a: 1, b: 2, c: 3, field1: "John", field2: "Mary" }});
			assert('Test 1', test1, '1.1 1.2 1.3  a John 1+2=3 33');
			var test2 = j.transformJSON({ test2: { p1: [ { p1a: "a" }, { p1a: "b" } ], p2: [1, 2, 3] } });
			assert('Test 2', test2, '2.1 ab.');
		})
		.catch((e) => console.log(e));
}

function assert(test, result, expected) {
	var text = result.innerHTML;
	var div = document.createElement('div');
	div.style.padding = '6px';
	if (text === expected) {
		div.style.backgroundColor = 'lawngreen';
		div.innerText = test + ' passed';
	} else {
		div.style.backgroundColor = 'red';
		div.innerText = test + ' failed';
		var child = document.createElement('pre');
		child.innerText = '"' + text + '"\n"' + expected + '"';
		div.appendChild(child);
	}
	results.appendChild(div);
}

