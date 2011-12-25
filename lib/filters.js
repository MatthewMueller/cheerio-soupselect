/*
 * Filters for soupselect
 */

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

module.exports = filters;
