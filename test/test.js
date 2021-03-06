var j = new joth();
var jFail = new joth();

var pre = '<?xml version="1.0"?><j:stylesheet xmlns:j="http://blight.co/Transform">';
var post = '</j:stylesheet>';

function pageLoaded() {
	j.loadUrl('test.xml')
		.then(() => {
			startTests();
		});
}

function startTests() {
	var a = document.getElementById('TestA');
	var b = document.getElementById('TestB');
	var c = document.getElementById('TestC');

// Test A 
	startTest(a, 'Test A - loads that should cause exceptions');
	shouldFailLoad(a, jFail, 'Test A1', '<j:function name="a" />', 'Main node missing');
	shouldFailLoad(a, jFail, 'Test A2', '<j:main/><j:function />', 'No name property on function');
	shouldFailLoad(a, jFail, 'Test A3', '<j:main/><j:function name="a" /><j:function name="a" />', 'Function "a" duplicated');
	shouldFailLoad(a, jFail, 'Test A4', '<j:main/><j:call name="doesntExist" />', 'Function "doesntExist" does not exist');

// Test B
	startTest(b, 'Test B - transforms that should run ok'+timing1(j));
	var testB1 = j.transformJSON({ testB1: { p1: 'B1.1 ', p2: 'B1.2 ', p3: 'B1.3 ', a: 1, b: 2, c: 3, field1: "John", field2: "Mary" }});
	assert(b, 'Test B1'+timing2(j), testB1, 'B1.1 B1.2 B1.3  a John 1+2=3 33');
	var testB2 = j.transformJSON({ testB2: { p1: [ { p1a: "a" }, { p1a: "b" } ], p2: [1, 2, 3] } });
	assert(b, 'Test B2'+timing2(j), testB2, 'B2.1 ab. B2.2 123 B2.3 ab ');
	var testB3 = j.transformJSON({ testB3: { p1: "stuff" } });
	assert(b, 'Test B3'+timing2(j), testB3, 'B3.1 B3.2 B3.3 ');
	var testB4 = j.transformJSON({ testB4: { p1: "1p", p2: "2p", p3: "3p" } });
	assert(b, 'Test B4'+timing2(j), testB4, 'B4.1 1.1v 2a 3p 1.2v 2a 3p 4v ok ');
	var testB5 = j.transformJSON({ testB5: { p1: "1p", p2: "2p", p3: "3p" } });
	assert(b, 'Test B5'+timing2(j), testB5, '<div id="B5.1" a="a1"></div><div id="B5.1" a="a2"></div><div id="B5.1" a="a3"></div><div id="B5.1" a1="a1" a2="a2"></div>');

// Test C
	startTest(c, 'Test C - transforms that should cause exceptions'+timing1(j));
	var testC1 = { testC1: {  }}
	shouldFailTransform(c, j, 'Test C1', testC1, 'Name attribute empty, originally "{context.doesntExist}"');
	var testC2 = { testC2: { p1: 'DoesntExist' }}
	shouldFailTransform(c, j, 'Test C2', testC2, 'Could not find function "DoTestC2.DoesntExist", originally "DoTestC2.{context.p1}"');
	
}

function getDiv() {
	var div = document.createElement('div');
	div.style.padding = '6px';
	return div;
}

function startTest(parent, test) {
	var div = getDiv()
	div.innerText = "Starting "+test;
	parent.appendChild(div);
}

function timing1(j) {
	return ' (' + j.timing.load.process.toFixed(3) + 's)';
}

function timing2(j) {
	return ' (' + j.timing.transform.process.toFixed(3) + 's)';
}

function assert(parent, test, result, expected) {
	var text = (typeof result == 'string') ? result : result.innerHTML;
	var div = getDiv();
	if (text === expected) {
		div.style.backgroundColor = 'lawngreen';
		div.innerText = test + ': Passed';
	} else {
		div.style.backgroundColor = 'red';
		div.innerText = test + ': Failed';
		var child = document.createElement('pre');
		child.innerText = '-->' + text + '<--\n-->' + expected + '<--';
		div.appendChild(child);
	}
	parent.appendChild(div);
}

function shouldFailLoad(parent, j, name, s, expected) {
	try {
		j.loadString(pre+s+post);
		assert(parent, name+timing1(j), 'Continued execution', 'Should have caused exception');
	} catch(e) {
		console.log(e);
		assert(parent, name+timing1(j), e.message, expected);
	}
}

function shouldFailTransform(parent, j, name, test, expected) {
	try {
		var result = j.transformJSON(test);
		assert(parent, name+timing2(j), 'Continued execution', 'Should have caused exception');
	} catch(e) {
		console.log(e)
		assert(parent, name+timing2(j), e.message, expected);
	}
}


