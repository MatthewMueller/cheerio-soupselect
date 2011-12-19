/*
 * Port of Simon Willison's Soup Select http://code.google.com/p/soupselect/
 * http://www.opensource.org/licenses/mit-license.php
 *
 * MIT licensed http://www.opensource.org/licenses/mit-license.php
 */

var domUtils = require("htmlparser2").DomUtils;

/*
 Selecting the tag and attribute(s):
 
 /^([a-z0-9_]+)?((?:\[(?:[a-z0-9_-]+)(?:[=~\|\^\$\*]?)=?["']?(?:[^\]"']*)["']?\])+)?$/;
    \------/ 
       |
      Tag

 Parsing the attribute(s):
    
 /\[([a-z0-9_-]+)([=~\|\^\$\*]?)=?["']?([^\]"']*)["']?\]/g;
     \--------/    \----------/         \------/
      |                 |                  |
      |                 |                Value
      |           ~,|,^,$,* or =
  Attribute
*/

var attrSelectRe = /^([a-z0-9_]+)?((?:\[(?:[a-z0-9_-]+)(?:[=~\|\^\$\*]?)=?["']?(?:[^\]"']*)["']?\])+)?$/;
var attrParseRe = /\[([a-z0-9_-]+)([=~\|\^\$\*]?)=?["']?([^\]"']*)["']?\]/g;

/*
 * Takes an operator and a value and returns a function which can be used to
 * test other values against test provided value using the given operation
 * Used to checking attribute values for attribute selectors
 */

function makeValueChecker(operator, value) {
    value = typeof(value) === 'string' ? value : '';
    
    return operator ? {
        '=': function ( test_value ) { return test_value === value; },
        // attribute includes value as one of a set of space separated tokens
        '~': function ( test_value ) { return test_value ? test_value.split(/\s+/).indexOf(value) !== -1 : false; },
        // attribute starts with value
        '^': function ( test_value ) { return test_value ? test_value.substr(0, value.length) === value : false; },
        // attribute ends with value
        '$': function ( test_value ) { return test_value ? test_value.substr(-value.length) === value : false; },
        // attribute contains value
        '*': function ( test_value ) { return test_value ? test_value.indexOf(value) !== -1 : false; },
        // attribute is either exactly value or starts with value-
        '|': function ( test_value ) { return test_value ? test_value === value ||
             test_value.substr(0, value.length + 1) === value + '-' : false; },
        // default to just check attribute existence...
        }[operator] : function ( test_value ) { return test_value ? true : false; };

}

/*
 * select()'s real implementation
 */

var _select = function(dom, selector) {
    var currentContext = Array.isArray(dom) ? dom : [dom];
    var found, tag, options;
   
    // This allows requests like "#main [class='main post']" without spliting on
    // the space between 'main' and 'post'
    var tokens = selector.split(/(\[.*?\]|\S*)/).filter(function(val){
        return val.replace(/\s*/, "").length ? true : false;  
    });

    for ( var i = 0; i < tokens.length; i++ ) {
        
        // Attribute and Tag selectors
        var match = attrSelectRe.exec(tokens[i]);
        if ( match ) {
            var tag = match[1], attributes = match[2];

            found = [];
            if ( tag ) {
                // Filter to only those matching the tag name
                currentContext.forEach(function(ctx){
                    found = found.concat(domUtils.getElements({ 'tag_name': tag }, ctx, true));
                });
                
                currentContext = found;
            }
            
            if ( attributes ) {
                // Further refine based on attributes
                var attrmatch; 
                while(attrmatch = attrParseRe.exec(attributes)){
                    var attr = attrmatch[1], 
                        operator = attrmatch[2], 
                        value = attrmatch[3];
                    
                    options = {};
                    options[attr] = makeValueChecker(operator, value);
                    
                    found = [];
                    currentContext.forEach(function(ctx){
                        // Don't want any recursion if we're already in the set of tags which have
                        // the desired tag name
                        found = found.concat(domUtils.getElements(options, ctx, (tag ? false : true)));
                    });
                    
                    currentContext = found;
                }
            }

            currentContext = found;
        } 
    
        // ID selector
        else if ( tokens[i].indexOf('#') !== -1 ) {
            found = [];
            
            var id_selector = tokens[i].split('#', 2)[1];
            
            // need to stop on the first id found (in bad HTML)...
            var el = null;
            for ( var k = 0; k < currentContext.length; k++ ) {
                
                // the document has no child elements but tags do so we search children to avoid
                // returning the current element via a false positive
                if ( typeof currentContext[k].children !== 'undefined' ) {
                    el = domUtils.getElementById(id_selector, currentContext[k].children, true);
                } else {
                    el = domUtils.getElementById(id_selector, currentContext[k], true);
                }

                if ( el ) {
                    found.push(el);
                    break;
                }
            }
            
            if (!found[0]) {
                currentContext = [];
                break;
            }
            
            currentContext = found;
        }
        
        // Class selector
        else if ( tokens[i].indexOf('.') !== -1 ) {
            var parts = tokens[i].split('.');
            tag = parts[0];
            options = {};
            
            options['class'] = function (value) {
                if (!value) return false;
                
                var classes = value.split(/\s+/);
                for (var i = 1, len = parts.length; i < len; i++) {
                    if (classes.indexOf(parts[i]) == -1) return false;
                }
                
                return true;
            };
            
            found = [];
            for ( var l = 0; l < currentContext.length; l++ ) {
                var context = currentContext[l];
                if ( tag.length > 0 ) {
                    context = domUtils.getElementsByTagName(tag, context, true);
                    // don't recurse in the case we have a tag or we get children we might not want
                    found = found.concat(domUtils.getElements(options, context, false));
                } else {
                    found = found.concat(domUtils.getElements(options, context, true));
                }                
            };
            
            currentContext = found;
        }
        
        // Star selector
        else if ( tokens[i] === '*' ) {
            // nothing to do right?
        }

        // Nothing matches
        else{
            
            currentContext = [];
            break;
        }
    };
   
	return currentContext;
};

/*
 * Takes a dom tree or part of one from htmlparser and applies
 * the provided selector against. The returned value is also
 * a valid dom tree, so can be passed by into 
 * htmlparser.DomUtil.* calls
 */

exports.select = function(dom, selector){

    var subselects = selector.split(/(?:\s*)?,(?:\s*)?/),
        ctxs = [];

    subselects.forEach(function(sub){
        ctxs = ctxs.concat(_select(dom, sub));
    });

    return ctxs;
};
