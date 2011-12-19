var htmlparser = require("htmlparser2"),
	assert = require("assert"),
	util = require("util"),
	soupselect = require("../lib/soupselect");

var opts = {
	ignoreWhitespace: true,
};

var fs = require("fs");
var html = fs.readFileSync("./index.html", "utf8");

var handler = new htmlparser.DefaultHandler(function(){}, opts); 
var parser = new htmlparser.Parser(handler);

parser.includeLocation = false;
parser.parseComplete(html);

var dom = handler.dom;
var look = function(obj){
	console.log(util.inspect(obj, false, 10));
}

look(soupselect.select(dom, "h2[type=awesome][color=green]"));
look(soupselect.select(dom, "[type=awesome][color='blue']"));
look(soupselect.select(dom, "[color='blue']"));
look(soupselect.select(dom, "[classi~=lol][class~=cats]"));
look(soupselect.select(dom, "h3[color][type=cookie]"));
