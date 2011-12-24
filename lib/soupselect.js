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
         |              |                  |
         |              |                Value
         |        ~,|,^,$,* or =
     Attribute

 Parsing the filter:

 /^([a-z0-9\s=~\|\^\$\*'"\[\]\(\)\.#]+?)?:([a-z0-9-_]+)(?:\(["']?(.+?)?["']?\))?$/;
    \-------------------------------/       \--------/           \---/
                    |                           |                  |
                 Context                      Filter            Argument
*/

var attrSelectRe = /^([a-z0-9_]+)?((?:\[(?:[a-z0-9_-]+)(?:[=~\|\^\$\*]?)=?["']?(?:[^\]"']*)["']?\])+)?$/;
var attrParseRe = /\[([a-z0-9_-]+)([=~\|\^\$\*]?)=?["']?([^\]"']*)["']?\]/g;
var filterParseRe = /^([a-z0-9\s=~\|\^\$\*'"\[\]\(\)\.#]+?)?:([a-z0-9-_]+)(?:\(["']?(.+?)?["']?\))?$/;

//TODO: Add all of the basic filters, as well as :contains and :empty
//      see http://api.jquery.com/category/selectors/basic-filter-selectors/

var filters = {
    "contains": function(ctx, val){
        var found = [],
            valRe = new RegExp(val);

        var recurse = function(node){
            if(node.children){
                for(var j = 0; j < node.children.length; j++){
                    var child = node.children[j];
                    if(child.children)
                        recurse(child);
                    else if(child.data)
                        if(valRe.test(child.data))
                            found.push(node);
                }
            }
        }

        for(var i = 0; i < ctx.length; i++){
            for(var p = 0; p < ctx[i].length; p++){
                recurse(ctx[i][p]);
            }
        }

        return found;
    },
    "header": function(ctx, val){
        var found = [],
            sort = function(name){ return /^h[1-9]+$/.test(name) };

        for(var i = 0; i < ctx.length; i++){
            found = found.concat(domUtils.getElements({ tag_name : sort }, ctx[i], true));
        }

        return found;
    },
    "not": function(ctx, val){
        var found = [],
            nots = exports.select(ctx, val);

        var cmp = function(a, b){
            var keys = Object.keys(a);
            for(var z = 0; z < keys.length; z++){
                if(a[keys[z]] !== b[keys[z]]) return false;
            }

            return true;
        }

        var recurse = function(node){
            var match = true;
            for(var t = 0; t < nots.length; t++){
                if(!cmp(nots[t], node)){
                    match = false;
                    break;
                }
            }

            if(!match) found.push(node);

            if(node.children){
                for(var c = 0; c < node.children.length; c++){
                    var child = node.children[c];
                    if(!child.data) recurse(child);
                }
            }
        }

        for(var j = 0; j < ctx.length; j++){
            for(var p = 0; p < ctx[j].length; p++){
                recurse(ctx[j][p]);
            }
        }

        return found;
    },
    "empty": function(ctx){
        var found = [];

        var recurse = function(node){
            if(typeof node.children === "undefined")
                if(node.type == "tag") found.push(node);
            else{
                for(var g = 0; g < node.children.length; g++){
                    recurse(node.children[g]);
                }
            }
        }

        for(var i = 0; i < ctx.length; i++){
            for(var p = 0; p < ctx[i].length; p++){
                recurse(ctx[i][p]);
            }
        }

        return found;
    },
    "eq": function(ctx, val){
        var found = [];
        for(var i = 0; i < ctx.length; i++){
            found = found.concat(ctx[i]);
        }
        return [found[val]];
    },
    "gt": function(ctx, val){
        var found = [];
        for(var i = 0; i < ctx.length; i++){
            found = found.concat(ctx[i]);
        }
        return found.slice(-(val-1));
    },
    "lt": function(ctx, val){
        var found = [];
        for(var i = 0; i < ctx.length; i++){
            found = found.concat(ctx[i]);
        }
        return found.slice(0, val);
    },
    "even": function(ctx){
        var found = [];
        for(var i = 0; i < ctx.length; i++){
            for(var j = 0; j < ctx[i].length; j++){
                if((j % 2) === 1) found.push(ctx[i][j]);
            }
        }
        return found;
    },
    "odd": function(ctx){
        var found = [];
        for(var i = 0; i < ctx.length; i++){
            for(var j = 0; j < ctx[i].length; j++){
                if((j % 2) === 0) found.push(ctx[i][j]);
            }
        }
        return found;
    },
    "first": function(ctx){
        return filters.eq(ctx, 0);
    },
    "last": function(ctx){
        var last = ctx[ctx.length-1];
        return last.length ? last[last.length-1] : [];
    },
};

/*
 * You can add your own custom filters by adding them to
 * the filters object.
 */

exports.filters = filters;

/*
 * Takes an operator and a value and returns a function which can be used to
 * test other values against test provided value using the given operation
 * Used to checking attribute values for attribute selectors
 */

var makeValueChecker = function(operator, value) {
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

    // This allows requests like "#main [class='main post']" or "dev span:contains("add by")
    // without spliting on the space between 'main' and 'post' or 'add' and 'by'

    // TODO: This is hacky, FIXME
    var tokens = [];
    selector.split(/\s+/).forEach(function(part, i){
        if(/[\]\)]/.test(part) && !/[\[\(]/.test(part))
            tokens[i-1] = tokens[i-1].concat(" "+part);
        else tokens[i] = part;
    });

    tokens = tokens.filter(function(elem){ return elem.length ? true : false });

    // Avoids needing to flatten the currentContext
    // at the end every time there isn't a selector
    var push = function(array){
        if(typeof filterFunction === 'function')
            found.push(array);
        else
            found = found.concat(array);
    }

    // Factored out as it would have been repeated when
    // applying the nested selector catching
    var applyFilter = function(filterMatch){
        var presel = filterMatch[1],
            fil = filters[filterMatch[2]] || function(){ return [] },
            arg = filterMatch[3];

        found = [];
        if( presel ){
            // filter those matching the left side of the :
            for(var v = 0; v < currentContext.length; v++){
                // Add each context to the array as an array,
                // in this way, the filter know how the elements are
                // grouped per parent
                found.push(_select(currentContext[v], presel));
            }

            //now apply filter
            found = fil(found, arg);
        }else{
            // if no left side is found, assume that you want this parsed
            found = fil([currentContext], arg);
        }

        // If something ever goes wrong with filters, IT IS IMPERITIVE that you
        // check the filter function, and make sure it is returing a PROPER ARRAY

        // Makes sure that the argMatch applyFilter has the right context
        currentContext = found;

        // Handle nested filters
        var argMatch = filterParseRe.exec(arg);
        if(argMatch)
            applyFilter(argMatch);

        currentContext = found;
    }

    for ( var i = 0; i < tokens.length; i++ ) {

        var filterMatch, match;

        // Star selector
        if( tokens[i] === "*" ){
            // Nothing to do here
            continue;
        }

        // Filter selectors
        else if( filterMatch = filterParseRe.exec(tokens[i])){
            // All the work happens in applyFilter
            applyFilter(filterMatch);
        }

        // Attribute and Tag selectors
        else if ( match = attrSelectRe.exec(tokens[i])) {
            var tag = match[1], attributes = match[2];

            found = [];
            if ( tag ) {
                // Filter to only those matching the tag name
                for(var t = 0; t < currentContext.length; t++){
                    push(domUtils.getElementsByTagName(tag, currentContext[t], true));
                }

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
                    for(var q = 0; q < currentContext.length; q++){
                        // Don't want any recursion if we're already in the set of tags which have
                        // the desired tag name
                        push(domUtils.getElements(options, currentContext[q], (tag ? false : true)));
                    }

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
            found.push(domUtils.getElementById(id_selector, currentContext, true));

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
                    push(domUtils.getElements(options, context, false));
                } else {
                    push(domUtils.getElements(options, context, true));
                }
            };

            currentContext = found;
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
 * Provided to be used in custom selectors. Note that adding selectors
 * to filters automatically makes them elligible for nesting and so forth.
 * The only thing a custom filter needs to worry about is returning the proper
 * array of elements.
 */

exports._select = _select;

/*
 * Takes a dom tree or part of one from htmlparser and applies
 * the provided selector against. The returned value is also
 * a valid dom tree, so can be passed by into
 * htmlparser.DomUtil.* calls
 */

exports.select = function(dom, selector){

    var subsels = selector.split(/(?:\s*)?,(?:\s*)?/),
        ctxs = [];

    for(var i = 0; i < subsels.length; i++){
        ctxs = ctxs.concat(_select(dom, subsels[i]));
    }

    return ctxs;
};
