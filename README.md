# cheerio-soupselect

A fork of harryf's [node-soupselect]
(http://github.com/harryf/node-soupselect),
which is originally a port of Simon Willison's 
[soupselect](http://code.google.com/p/soupselect/) 
for use with node.js and node-htmlparser.

## Installation

    $ npm install cheerio-soupselect

## Features

cheerio-soupselect supports custom filters through the 
exported `filters` object. It's simple:

    var soupselect = require("cheerio-soupselect"),
        filters = soupselect.filters;
    ...
    filters["custom-filter"] = function(ctx, val){
        console.log("Hello filters!");
        return [];
    };
    ...
    var ret = soupselect.select(dom, ":custom-filter('awesome arg')");

The `ctx` parameter provides an array of `htmlparser2`
DOMs, which are themselves arrays. These element are
grouped by parent. 

The `val` parameter provides access to everything inside
the brackets of the filter, if anything. 

A few notes about custom selectors:

* Your custom function **must** return an array.

* For the most part, you will not need to handle 
nesting filters/selectors. However, if you wish 
to modify the nested selector then, you may do 
so by modifiying `val`.

## Testing

From the root folder:

    $ mocha -u tdd -R list

