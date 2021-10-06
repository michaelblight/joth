var jothNs = 'http://blight.co/Transform';

function jothException(source, message, detail) {
	this.source = source;
	this.message = message;
	this.detail = detail;
}
jothException.prototype = Object.create(Error.prototype);

function __nsResolver(prefix) {
	return jothNs;
}

function __jothState(context, args, vars) {
	this.context = context;
	this.args = {};
	this.vars = {};
	__copyKeyValues(args, this.args);
	__copyKeyValues(vars, this.vars);
}

function __copyKeyValues(from, to) {
	var keys = Object.keys(from);
	for (var i=0; i<keys.length; i++) {
		var key = keys[i];
		to[key] = from[key];
	}
}

function __jothEval(s) {
	var func = '"use strict";try { return (' + s + ') } catch(e) { return undefined; }';
	console.log(s);
	return new Function('root', 'context', 'args', 'vars', func);
}

class joth {
	
	constructor() {
		this.xt = null;
		this.main = null;
		this.options = { includeComment: false, debug: 0 }
		this.timing = { 
			load:		{ start: 0, mid: 0, end: 0, duration: 0, process: 0 }, 
			transform:	{ start: 0, mid: 0, end: 0, duration: 0, process: 0 }
		}
	}

	xt = null;
	
	test() {
		return new Promise((resolve, reject) => { resolve(1); });
	}
	
	load(url) {
		var that = this;
		that.timing.load.start = new Date();
		if (that.options.debug > 0) console.log({ source: 'load', url: url })
		return new Promise((resolve, reject) => {
			that._loadXml(url)
				.then((xml) => {
					that.xt = xml;
				})
				.then(() => that._loadIncludes())
				.then(() => {
					that.timing.load.mid = new Date();
					that._parse();
					that._setDuration(that.timing.load);
					resolve();
				})
				.catch((e) => { 
					reject(e);
				});
		});
	}
	
	loadString(s) {
		var that = this;
		if (that.options.debug > 0) console.log({ source: 'loadString', s: s });
		that.xt = that._loadXmlString(s);
		that._parse();
	}
	
	transformUrl(url) {
		var that = this;
		that.timing.transform.start = new Date();
		if (that.options.debug > 0) console.log({ source: 'transformUrl', url: url })
		return new Promise((resolve, reject) => {
			fetch(url)
				.then((result) => result.json())
				.then((json) => {
					that.timing.transform.start = new Date();
					if (that.options.debug > 0) console.log({ source: 'transformUrl', json: json })
					that.root = json;
					var e = that._transform(json);
					that._setDuration(that.timing.transform);
					resolve(e);
				})
				.catch((e) => { 
					if (that.options.debug > 0) console.log({ source: 'transformUrl', exception: e })
					reject(e);
				});
		});
	}
	
	transformJSON(json) {
		var that = this;
		that.timing.transform.start = new Date();
		that.timing.transform.mid = new Date();
		if (that.options.debug > 0) console.log({ source: 'transformJSON', json: json })
		that.root = json;
		var result = that._transform(json);
		that._setDuration(that.timing.transform);
		return result;
	}
	
	transformUrlTo(url, dest) {
		var that = this;
		if (that.options.debug > 0) console.log({ source: 'transformUrlTo', url: url })
		return new Promise((resolve, reject) => {
            that.transformUrl(url)
                .then((e) => {
                    if (typeof dest == 'string') dest = document.getElementById(dest);
                    if (dest === null) {
                        throw new jothException('joth.transformUrlTo', 'Dest missing', dest);
                    }
                    while (dest.firstChild) dest.firstChild.remove();
                    while (e.firstChild) dest.appendChild(e.firstChild);
                    resolve();
                })
				.catch((e) => { 
					reject(e);
				});
		});
	}

	toString(e = null, nsPrefix = 'j') {
		var ser = new XMLSerializer();
		if (e) {
			var s = ser.serializeToString(e);
			if (nsPrefix) {
				return s.replace(' xmlns:'+nsPrefix+'="'+jothNs+'"', ''); // Bit dodgy, but remove namespace
			}
			return s;
		}
		return ser.serializeToString(this.xt);
	}
	
	_toNodeString(e) {
		// Dodgy way of getting string of parent node without children
		var s = this.toString(e);
		var i = s.indexOf('>');
		return (i < 0) ? s : s.substring(0, i+1);
	}

	_loadXmlString(s) {
		return new DOMParser().parseFromString(s, "text/xml");
	}

	_loadXml(url) {
		var that = this;
		return new Promise((resolve, reject) => {
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (this.readyState == 4) {
					if (this.status == 200) {
						if (that.options.debug >= 5) console.log({ 'source': '_loadXml', xml: this.responseXML, text: this.responseText });
						if (this.responseXML) {
							resolve(this.responseXML);
						} else {
							reject(this);
						}
					} else {
						reject();
					}
				}
			};
			xhr.open("GET", url, true);
			xhr.setRequestHeader("Cache-Control", "no-cache");
			xhr.setRequestHeader("Pragma", "no-cache");
			xhr.send();
		});
	}
	
	_loadIncludes() {
		var that = this;
		return new Promise((resolve, reject) => {
			var that = this;
			var children = that.xt.documentElement.childNodes;
			var promises = [];
			for (var i=children.length-1; i>=0; i--) {
				var e = children[i];
				if ((e.namespaceURI == jothNs) && (e.localName == 'include')) {
					var url = that._attrValue(e, 'href');
					if (!url) throw new jothException('joth._loadIncludes', 'No href property on include', that._toNodeString(e));
					promises.push(that._loadInclude(e, url));
				}
			}
			if (that.options.debug > 0) console.log({ source: '_loadIncludes', message: 'Loading '+promises.length+' includes' });
			Promise.all(promises).then(() => {
				if (that.options.debug > 0) console.log({ source: '_loadIncludes', message: 'Loaded' });
				resolve();
			});
		});
	}
	
	_loadInclude(e, url) {
		var that = this;
		return new Promise((resolve, reject) => {
			that._loadXml(url)
				.then((xml) => {
					if (that.options.debug > 0) console.log({ source: '_loadInclude', message: "Loaded from '"+url+"'", text: that.toString(xml.documentElement) });
					var parent = e.parentNode;
					var doc = xml.documentElement;
					while (doc.firstChild) parent.insertBefore(doc.firstChild, e);
					e.remove();
					resolve();
				})
				.catch((e) => { 
					reject(e);
				});
		});
	}

	_parse() {
		var that = this;
		that.functions = {};
		that.subAttrs = [];
		var doc = that.xt;
		var e = doc.documentElement;
		if ((e.namespaceURI !== jothNs) || (e.localName !== 'stylesheet')) {
			throw new jothException('joth._parse', 'Stylesheet node missing', that._toNodeString(e));
		}
		that._removeUnwantedNodes(e);
		e.childNodes.forEach((child) => {
			if (child.namespaceURI == jothNs) {
				if (child.localName == 'main') {
					that.main = child;
				} else if (child.localName === 'function') {
					var name = child.attributes['name'];
					if (!name) throw new jothException('joth._parse', 'No name property on function', that._toNodeString(child));
					if (that.functions[name.value]) throw new jothException('joth._parse', 'Function "'+name.value+'" duplicated', that._toNodeString(child));
					that.functions[name.value] = child;
				}
			}
			that._parseAttrs(child);
		});
		that._parseCheckCalls(doc);
		if (that.options.debug >= 5) console.log({ 'source': '_parse', xt: that.xt, text: that.toString() });
		var keys = Object.keys(that.functions);
		if (that.options.debug > 0) console.log({ source: '_parse', message: 'Parsed '+that.subAttrs.length+' tags with {} and '+keys.length+' functions', functions: keys });
		if (that.main == null) {
			throw new jothException('joth._parse', 'Main node missing',null);
		}
	}

	_parseCheckCalls(doc) {
		var that = this;
		var nodes = doc.evaluate('//j:call', doc, __nsResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
		var node = nodes.iterateNext();
		while (node) {
			var name = node.getAttribute('name');
			if (name && name.indexOf('{') < 0) { // Can't check now if contains {}
				if (!that.functions[name]) throw new jothException('joth._parse', 'Function "'+name+'" does not exist', that._toNodeString(node));
			}
			node = nodes.iterateNext();
		}
	}
	
	_removeUnwantedNodes(e) {
		var that = this;
		if (e.nodeType == 3) {
			if (e.nodeValue.replace(/^\s+|\s+$/g, '').length == 0) {
				e.remove();
			}
		} else if (e.nodeType == 8) {
			e.remove();
		} else if (e.nodeType == 1) {
			for (var i=e.childNodes.length-1; i>=0; i--) {
				that._removeUnwantedNodes(e.childNodes[i]);
			}
		}
	}

	_parseAttrs(e) {
		var that = this;
		if (e.attributes) {
			for (var a of e.attributes) {
				if (a.value.includes('{')) {
					that.subAttrs.push(e);
					break;
				}
			}
		}
		if (e.nodeType == 1) {
			e.childNodes.forEach((child) => that._parseAttrs(child));
		}
	}
	
	_transform(json) {
		var that = this;
		that.state = new __jothState(json, {}, {});
        var result = document.createElement('div');
		if (that.options.debug >= 5) console.log({ 'source': '_transform', json: json });
		that.main.childNodes.forEach((e) => {
			that._transformNode(e, that.state, result, 0);
		});
        return result;
	}

	_transformNode(e, state, parent, depth) {
		var that = this;
		if (parent == null) throw new jothException('joth._transformNode', "Did not expect parent to be null", e); 
		var dom = parent;
		if (e.nodeType == 1) {
			if (e.namespaceURI == jothNs) {
				dom = that._transformJoth(e, state, parent, depth);
			} else {
				dom = document.createElement(e.tagName);
				that._copyAttrs(e, dom, state);
				if (that.options.debug >= 10) console.log({ 'source': '_transformNode', node: that.toString(dom) });
				parent.appendChild(dom);
				that._transformChildren(e, state, dom, depth);
			}
		} else if (e.nodeType == 3) {
			dom = document.createTextNode(e.wholeText);
			parent.appendChild(dom);
		}
		return dom;
	}
	
	_transformChildren(e, state, parent, depth) {
		var that = this;
		if (e.childNodes) {
			e.childNodes.forEach((child) => {
				that._transformNode(child, state, parent, depth+1);
			});
		}
	}
	
	_transformJoth(e, state, parent, depth) {
		var that = this;
		var dom = parent;
		if (that.options.includeComment) that._includeComment('Start: ', e, state, parent, depth)
		if (e.localName == 'call') {
			dom = that._transform_call(e, state, parent, depth);
		} else if (e.localName == 'call-foreach') {
			dom = that._transform_call_foreach(e, state, parent, depth);
		} else if (e.localName == 'choose') {
			dom = that._transform_choose(e, state, parent, depth);
		} else if (e.localName == 'foreach') {
			dom = that._transform_foreach(e, state, parent, depth);
		} else if (e.localName == 'if') {
			dom = that._transform_if(e, state, parent, depth);
		} else if (e.localName == 'text') {
			dom = that._transform_text(e, state, parent, depth);
		} else if (e.localName == 'value-of') {
			dom = that._transform_value_of(e, state, parent, depth);
		} else if (e.localName == 'variable') {
			dom = that._transform_variable(e, state, parent, depth);
		} else if (e.localName == 'variables') {
			dom = that._transform_variables(e, state, parent, depth);
		} else {
			that._transformChildren(e, state, dom);
		}
		if (dom == null) {
			console.log("why is dom null "+that.toString(e));
		}
		if (that.options.includeComment) that._includeComment('End: ', e, state, parent, depth)
		return dom;
	}

	_includeComment(prefix, e, state, parent, depth) {
		var that = this;
		var parts = [];
		parts.push(prefix+' '+e.tagName);
		for (var i=0; i<e.attributes.length; i++) {
			var a = e.attributes[i];
			var je = (a.value.indexOf('{') >= 0) ? '="'+that._attrEval(a.value, state)+'"' : '';
			parts.push(a.name+'="'+a.value+'"'+je);
		}
		var nl = document.createTextNode('\n');
		parent.appendChild(nl);
		var comment = document.createComment(parts.join(' '));
		parent.appendChild(comment);
		parent.appendChild(nl);
	}
	
	_transform_call(e, state, parent, depth) {
		var that = this;
		var name = that._attrValue(e, 'name', state, false);
		if (!name) throw new jothException('joth._transform_call', 'Name attribute empty, originally "'+that._attr(e, 'name')+'"', e);
		var func = that.functions[name];
		if (!func) throw new jothException('joth._transform_call', 'Could not find function "'+name+'", originally "'+that._attr(e, 'name')+'"', e);
		var newstate = that._stateForAttr(e, "select", state);
		if (newstate.context) {
			func.childNodes.forEach((child) => {
				that._transformNode(child, newstate, parent, depth+1);
			});
		}
		return parent;
	}
	
	_transform_call_foreach(e, state, parent, depth) {
		var that = this;
		var name = that._attrValue(e, 'name', state);
		if (!name) throw new jothException('joth._transform_call_foreach', "Name attribute missing", e);
		var func = that.functions[name];
		if (!func) throw new jothException('joth._transform_call_foreach', "Could not find function '"+name+"'");
		var tempstate = that._stateForAttr(e, "select", state);
		var handled = false;
		if ((tempstate.context) && Array.isArray(tempstate.context)) {
			var args = that._getArgs(e);
			var len = tempstate.context.length;
			handled = (len > 0);
			for (var i=0; i<len; i++) {
				var item = tempstate.context[i];
				args.$info = { position: i+1, count: len, isFirst: (i==0), isLast: (i==len-1) }
				var newstate = new __jothState(item, args, state.vars);
				func.childNodes.forEach((child) => {
					that._transformNode(child, newstate, parent, depth+1);
				});
			}
		}
		if (!handled) {
			var otherwise = that._findElseNode(e);
			if (otherwise) {
				if (that.options.includeComment) that._includeComment('Else start: ', otherwise, state, parent, depth);
				that._transformChildren(otherwise, state, parent, depth);
				if (that.options.includeComment) that._includeComment('Else end: ', otherwise, state, parent, depth);
			}
		}
		return parent;
	}
	
	_transform_choose(e, state, parent, depth) {
		var that = this;
		var whens = e.childNodes;
		var handled = false;
		for (var i=0; i<whens.length; i++) {
			var when = whens[i];
			if (when.localName !== 'when') continue;
			var test = that._attrValue(when, 'test', state, true);
			if (that._isTrue(test, state)) {
				handled = true;
				if (that.options.includeComment) that._includeComment('When start: ', when, state, parent, depth);
				that._transformChildren(when, state, parent, depth);
				if (that.options.includeComment) that._includeComment('When end: ', when, state, parent, depth);
				break;
			}
		}
		if (!handled) {
			var otherwise = that._findElseNode(e);
			if (otherwise) {
				if (that.options.includeComment) that._includeComment('Else start: ', otherwise, state, parent, depth);
				that._transformChildren(otherwise, state, parent, depth);
				if (that.options.includeComment) that._includeComment('Else end: ', otherwise, state, parent, depth);
			}
		}
		return parent;
	}
	
	_transform_foreach(e, state, parent, depth) {
		var that = this;
		var tempstate = that._stateForAttr(e, "select", state);
		var handled = false;
		if ((tempstate.context) && Array.isArray(tempstate.context)) {
			var args = that._getArgs(e);
			var len = tempstate.context.length;
			handled = (len > 0);
			for (var i=0; i<len; i++) {
				var item = tempstate.context[i];
				args.$info = { position: i+1, count: len, isFirst: (i==0), isLast: (i==len-1) }
				var newstate = new __jothState(item, args, state.vars);
				func.childNodes.forEach((child) => {
					that._transformNode(child, newstate, parent, depth+1);
				});
			}
		}
		if (!handled) {
			var otherwise = that._findElseNode(e);
			if (otherwise) {
				if (that.options.includeComment) that._includeComment('Else start: ', otherwise, state, parent, depth);
				that._transformChildren(otherwise, state, parent, depth);
				if (that.options.includeComment) that._includeComment('Else end: ', otherwise, state, parent, depth);
			}
		}
		return parent;
	}
	
	_transform_if(e, state, parent, depth) {
		var that = this;
		var test = that._attrValue(e, 'test', state, true);
		var result = that._isTrue(test, state);
		if (that.options.debug > 0) console.log({ source: '_transform_if', test: test, result: result, state: state });
		if (result) {
			that._transformChildren(e, state, parent, depth);
		} else {
			var otherwise = that._findElseNode(e);
			if (otherwise) {
				if (that.options.debug > 0) console.log({ source: '_transform_if:else', test: test, result: result, state: state });
				if (that.options.includeComment) that._includeComment('Else start: ', otherwise, state, parent, depth);
				that._transformChildren(otherwise, state, parent, depth);
				if (that.options.includeComment) that._includeComment('Else end: ', otherwise, state, parent, depth);
			}
		}
		return parent;
	}
	
	_transform_text(e, state, parent, depth) {
		var that = this;
		var result = that._attrValue(e, 'value', state, false); 
		if (result) {
			var dom = document.createTextNode(result);
			parent.appendChild(dom);
		}
		that._transformChildren(e, state, parent, depth);
		return parent;
	}
	
	_transform_value_of(e, state, parent, depth) {
		var that = this;
		var hasParens = that._attrHasParens(e, "select");
		var value = that._attrValue(e, 'select', state, true);
		var je = __jothEval(value);
		var result = je(that.root, state.context, state.args, state.vars);
		if (result) {
			var dom = document.createTextNode(result);
			parent.appendChild(dom);
		}
		that._transformChildren(e, state, parent, depth);
		return parent;
	}
	
	_transform_variable(e, state, parent, depth) {
		var that = this;
		var name = that._attrValue(e, 'name', state, false); 
		var value = that._attrValue(e, 'value', state, false); 
		state.vars[name] = value;
		return parent;
	}
	
	_transform_variables(e, state, parent, depth) {
		var that = this;
		state.vars = {...state.vars, ...that._getArgs(e)}
		return parent;
	}
	
	_getArgs(e) {
		var args = {};
		for (var i=0; i<e.attributes.length; i++) {
			var a = e.attributes[i];
			args[a.name] = a.value;
		}
		return args;
	}
	
	_attrExists(e, name) {
		return (e.attributes[name]) ? true : false;
	}
	
	_attrHasParens(e, name) {
		var a = e.attributes[name];
		if (!a || !a.value) return false;
		return (a.value.indexOf('{') >= 0);
	}
	
	_attr(e, name) {
		var that = this;
		return (e.attributes[name]) ? e.attributes[name].value : null;
	}
	
	_attrValue(e, name, state, shouldPrefix = false) {
		var that = this;
		var value = (e.attributes[name]) ? e.attributes[name].value : null;
		var before = value;
		var result = value;
		if (value && value.indexOf('{') >= 0) {
			result = that._attrEval(value, state);
		} else if (value && shouldPrefix && !result.startsWith('context.') && !result.startsWith('args.') && !result.startsWith('vars.')) {
			result = 'context.' + result;
		}
		return result;
	}
	
	_attrEval(value, state) {
		var that = this;
		var repl = value;
		while (true) {
			if ((typeof repl) !== 'string') break;
			var i = repl.indexOf('{');
			if (i < 0) break;
			var j = repl.indexOf('}');
			if (j < 0) break;
			if (j < i) break;
			var left = repl.substring(0, i);
			var right = repl.substring(j+1);
			var mid = repl.substring(i+1, j);
			try {
				var je = __jothEval(mid);
				var result = je(that.root, state.context, state.args, state.vars);
				if (result == undefined) result = null;
				if (result && !isNaN(result) && (result.toString().indexOf(' ') < 0)) { // Don't treat extra spaces as a number
					result = parseFloat(result);
				}
				if ((left == '') && (right == '')) {
					repl = result;
				} else {
					repl = left + (result == null ? '' : result) + right;
				}
			} catch(e) {
				console.log("Exception: "+e);
				repl = left + right;
			}
		}
		return repl;
		//return (repl == undefined) ? '' : repl;
	}

	_stateForAttr(e, name, state) {
		var that = this;
		var newcontext = state.context;
		if (that._attrExists(e, name)) {
			var value = that._attrValue(e, name, state, true);
			value = that._attrEval(value, state);
			var je = __jothEval(value);
			newcontext = je(that.root, state.context, state.args, state.vars);
		}
		return new __jothState(newcontext, {...state.args, ...that._getArgs(e)}, state.vars);
	}
	
	_isTrue(test, state) {
		var that = this;
		var je = __jothEval(test);
		var result = je(that.root, state.context, state.args, state.vars);
		if (result == null) result = false;
		return result;
	}

	_findElseNode(e) {
		var that = this;
		var otherwise = null
		for (var i=0; i<e.childNodes.length; i++) {
			var child = e.childNodes[i];
			if ((child.namespaceURI == jothNs) && ((child.localName == 'else') || (child.localName == 'otherwise'))) {
				otherwise = child; // Do it this way so the last of multiple are selected like XSLT (I think?)
			}
		}
		return otherwise;
	}
	
	_copyAttrs(from, to, state) {
		var that = this;
		if (from.attributes) {
			for (var i=0; i<from.attributes.length; i++) {
				var name = from.attributes[i].name;
				var value = that._attrValue(from, name, state);
				if (value !== null) to.setAttribute(name, value);
			}
		}
	}

	_setDuration(obj) {
		obj.end = new Date();
		obj.duration = (obj.end.getTime() - obj.start.getTime()) / 1000;
		obj.process = (obj.end.getTime() - obj.mid.getTime()) / 1000;
	}
}