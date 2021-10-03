
function jothException(source, message, detail) {
	this.source = source;
	this.message = message;
	this.detail = detail;
}
jothException.prototype = Object.create(Error.prototype);

function jothState(context, args, vars) {
	this.context = context;
	this.args = args;
	this.vars = vars;
}

function jothEval(s) {
	return new Function('root', 'context', 'args', 'vars', 
		'"use strict";try { return (' + s + ') } catch(e) { return "" }');
}

class joth {
	
	constructor() {
		this.logLevel = 0;
		this.namespace = 'http://blight.co/Transform';
		this.xt = null;
		this.main = null;
	}

	xt = null;
	
	test() {
		return new Promise((resolve, reject) => { resolve(1); });
	}
	
	load(url) {
		var that = this;
		return new Promise((resolve, reject) => {
			that._loadXml(url)
				.then((xml) => {
					that.xt = xml;
				})
				.then(() => that._loadIncludes())
				.then(() => {
					that._parse();
					resolve()
				})
				.catch((e) => { 
					reject(e);
				});
		});
	}
	
	transformUrl(url) {
		var that = this;
		return new Promise((resolve, reject) => {
			fetch(url)
				.then((result) => result.json())
				.then((json) => {
					that.root = json;
					var e = that._transform(json);
					resolve(e);
				})
				.catch((e) => { 
					reject(e);
				});
		});
	}
	
	transformUrlTo(url, dest) {
		var that = this;
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

	toString(e = null) {
		var ser = new XMLSerializer();
		if (e) {
			var s = ser.serializeToString(e);
			return s.replace(' xmlns:j="'+this.namespace+'"', ''); // Bit dodgy, but remove namespace
		} else {
			return ser.serializeToString(this.xt);
		}
	}
	
	_toNodeString(e) {
		// Dodgy way of getting string of parent node without children
		var s = this.toString(e);
		var i = s.indexOf('>');
		return (i < 0) ? s : s.substring(0, i+1);
	}

	_loadXml(url) {
		var that = this;
		return new Promise((resolve, reject) => {
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (this.readyState == 4) {
					if (this.status == 200) {
						if (that.debug >= 5) console.log({ 'source': '_loadXml', xml: this.responseXML, text: this.responseText });
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
				if ((e.namespaceURI == that.namespace) && (e.localName == 'include')) {
					var url = that._attrValue(e, 'href');
					if (!url) throw new jothException('joth._loadIncludes', 'No href property on include', that._toNodeString(e));
					promises.push(that._loadInclude(e, url));
				}
			}
			if (that.debug > 0) console.log({ source: '_loadIncludes', message: 'Loading '+promises.length+' includes' });
			Promise.all(promises).then(() => {
				if (that.debug > 0) console.log({ source: '_loadIncludes', message: 'Loaded', text: that.toString() });
				resolve();
			});
		});
	}
	
	_loadInclude(e, url) {
		var that = this;
		return new Promise((resolve, reject) => {
			that._loadXml(url)
				.then((xml) => {
					if (that.debug > 0) console.log({ source: '_loadInclude', message: "Loaded from '"+url+"'", text: that.toString(xml.documentElement) });
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
		return new Promise((resolve, reject) => {
			var that = this;
			that.functions = {};
			that.subAttrs = [];
			var e = that.xt.documentElement;
			if ((e.namespaceURI !== that.namespace) || (e.localName !== 'stylesheet')) {
				throw new jothException('joth._parse', 'Stylesheet node missing', that._toNodeString(e));
			}
			that._removeUnwantedNodes(e);
			e.childNodes.forEach((child) => {
				if (child.namespaceURI == that.namespace) {
					if (child.localName == 'main') {
						that.main = child;
					} else if (child.localName === 'function') {
						var name = child.attributes['name'];
						if (!name) throw new jothException('joth._parse', 'No name property on function', that._toNodeString(child));
						that.functions[name.value] = child;
					}
				}
				that._parseAttrs(child);
			});
			if (that.debug >= 5) console.log({ 'source': '_parse', xt: that.xt, text: that.toString() });
			var keys = Object.keys(that.functions);
			if (that.debug > 0) console.log({ source: '_parse', message: 'Parsed '+that.subAttrs.length+' tags with {} and '+keys.length+' functions', functions: keys });
			if (that.main == null) {
				throw new jothException('joth._parse', 'Main node missing', that._toNodeString(e));
			}
			resolve();
		});
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
		that.state = new jothState(json, {}, {});
        var result = document.createElement('div');
		if (that.debug > 0) console.log({ 'source': '_transform', json: json });
		that.main.childNodes.forEach((e) => {
			console.log("Transforming "+that.toString(e));
			that._transformNode(e, that.state, result, 0);
		});
        return result;
	}

	_transformNode(e, state, parent, depth) {
		if ((parent == null) || (parent == 'null')) {
			console.log("Parent is null");
			console.log(e);
		}
		var that = this;
		var dom = parent;
		if (e.nodeType == 1) {
			if (e.namespaceURI == that.namespace) {
				dom = that._transformJoth(e, state, parent, depth);
			} else {
				dom = document.createElement(e.tagName);
				that._copyAttrs(e, dom, state);
				if (that.debug >= 10) console.log({ 'source': '_transformNode', node: that.toString(dom) });
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
		if (e.localName == 'call') {
			dom = that._transform_call(e, state, parent, depth);
		} else if (e.localName == 'call-foreach') {
			dom = that._transform_call_foreach(e, state, parent, depth);
		} else if (e.localName == 'case') {
			dom = that._transform_case(e, state, parent, depth);
			console.log("Finished case");
		} else if (e.localName == 'text') {
			dom = that._transform_text(e, state, parent, depth);
		} else if (e.localName == 'value-of') {
			dom = that._transform_value_of(e, state, parent, depth);
		} else if (e.localName == 'variables') {
			dom = that._transform_variables(e, state, parent, depth);
		} else {
			that._transformChildren(e, state, dom);
		}
		if (dom == null) {
			console.log("why is dom null "+that.toString(e));
		}
		return dom;
	}
	
	_transform_call(e, state, parent, depth) {
		var that = this;
		var name = that._attrValue(e, 'name', state);
		var func = that.functions[name];
		if (!func) throw new jothException('joth._transformJoth', "Could not find function '"+name+"'");
		console.log("Call "+name);
		var newstate = new jothState(state.context, that._getArgs(e), state.vars);
		var comment = document.createComment('call '+name);
		parent.appendChild(comment);
		func.childNodes.forEach((child) => {
			that._transformNode(child, newstate, parent, depth+1);
		});
		return parent;
	}
	
	_transform_call_foreach(e, state, parent, depth) {
		var that = this;
		var name = that._attrValue(e, 'name', state);
		var func = that.functions[name];
		if (!func) throw new jothException('joth._transformJoth', "Could not find function '"+name+"'");
		var comment = document.createComment('call-foreach '+name);
		parent.appendChild(comment);
		var args = that._getArgs(e);
		for (var i=0; i<e.childNodes.length-1; i++) {
			var child = e.childNodes[i];
			var newstate = new jothState(child, args, state.vars);
			func.childNodes.forEach((child) => {
				that._transformNode(child, newstate, parent, depth+1);
			});
		}
		return parent;
	}
	
	_transform_case(e, state, parent, depth) {
		var that = this;
		var whens = e.childNodes;
		for (var i=0; i<whens.length; i++) {
			var when = whens[i];
			if (when.localName !== 'when') continue;
			var test = that._attrValue(when, 'test', state);
			if (that._isTrue(test, state)) {
				that._transformChildren(when, state, parent, depth);
				break;
			}
		}
		return parent;
	}
	
	_transform_text(e, state, parent) {
		var that = this;
		var value = that._attrValue(e, 'select', state); 
		var dom = document.createTextNode(value);
		parent.appendChild(dom);
		return parent;
	}
	
	_transform_variables(e, state, parent) {
		var that = this;
		state.vars = {...state.vars, ...that._getArgs(e)}
		return parent;
	}
	
	_transform_value_of(e, state, parent) {
		var that = this;
		var value = that._attrValue(e, 'select', state); 
		var dom = document.createTextNode(value);
		parent.appendChild(dom);
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
	
	_attrValue(e, name, state, defValue = null) {
		var that = this;
		var value = (e.attributes[name]) ? e.attributes[name].value : defValue;
		if (value && value.indexOf('{') >= 0) value = that._attrEval(value, state);
		return value;
	}
	
	_attrEval(value, state) {
		var that = this;
		var parts = [];
		var repl = value;
		//var je = joshEval('context', 'args', 'vars', 's', '"use strict";return (' + s + ')')();
		while (true) {
			var i = repl.indexOf('{');
			if (i < 0) break;
			var j = repl.indexOf('}');
			if (j < 0) break;
			var left = (i < 0) ? '' : repl.substring(0, i);
			var right = (j < 0) ? '' : repl.substring(j+1);
			var mid = repl.substring(i+1, j);
			try {
				var je = jothEval(mid);
				var subst = je(that.root, state.context, state.args, state.vars);
				repl = left + (subst ? subst : '') + right;
			} catch(e) {
				console.log("Exception: "+e);
				repl = left + right;
			}
		}
		console.log(value+'->'+repl);
		return repl;
	}
	
	_isTrue(test, state) {
		var context = state.context;
		var args = state.args;
		var result = eval(test);
		var ret = (result) ? true : false;
		return (result) ? true : false;
	}
	
	_copyAttrs(from, to, state) {
		var that = this;
		if (from.attributes) {
			for (var i=0; i<from.attributes.length; i++) {
				var name = from.attributes[i].name;
				to.setAttribute(name, that._attrValue(from, name, state));
			}
		}
	}
}