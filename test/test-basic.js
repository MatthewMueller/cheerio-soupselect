var select = require("../lib/soupselect").select,
    assert = require("assert"),
    d = require("./dom"),
    look = d.look,
    dom = d.dom;

// Do note that every time you change the structure or elements used in this test
// You will have to reparse index.html

var head = [{type:'tag',name:'head',children:[{type:'tag',name:'meta',attribs:{'http-equiv':'Content-type',content:'text/html; charset=utf-8'}},{type:'tag',name:'title',children:[{data:'Test',type:'text'}]}]}];

var meta = [{type:'tag',name:'meta',attribs:{'http-equiv':'Content-type',content:'text/html; charset=utf-8'}}];

var ul_blue = [{type:'tag',name:'ul',attribs:{color:'blue'},children:[{type:'tag',name:'li',children:[{data:'water',type:'text'}]},{type:'tag',name:'li',children:[{data:'sky',type:'text'}]},{type:'tag',name:'li',children:[{data:'bluebird',type:'text'}]}]}];

var li_green = [{type:'tag',name:'li',attribs:{type:'awesome',color:'green'},children:[{data:'I am awesome, in green',type:'text'}]}];

var posts = [{type:'tag',name:'p',attribs:{id:'current post',class:'main post'},children:[{data:'\n\t        \tCras mattis consectetur purus sit amet fermentum.\n\t        ',type:'text'}]},{type:'tag',name:'p',attribs:{class:'post'},children:[{data:'\n\t        \tNullam quis risus eget urna mollis ornare vel eu leo.\n\t        ',type:'text'}]}];

suite("#select()", function(){
	test("should return [] when not present", function(){
		assert.deepEqual([], select(dom, "does_not_exist"));
		assert.deepEqual([], select(dom, "#not_there"));
		assert.deepEqual([], select(dom, ".disappeared"));
		assert.deepEqual([], select(dom, "[none]"));
	});
	test("should return [] when requests are incorrectly formatted", function(){
        assert.deepEqual([], select(dom, "[a+b]"));
        assert.deepEqual([], select(dom, ".$"));
    });
    test("should return proper elements", function(){
        assert.deepEqual(dom, select(dom, "html"));
        assert.deepEqual(head, select(dom, "head"));
     });
     test("should return proper elements based on attribute selectors", function(){
		assert.deepEqual(meta, select(dom, "[http-equiv]"));
		assert.deepEqual(meta, select(dom, "[content='text/html; charset=utf-8']"));
		assert.deepEqual(ul_blue, select(dom, "ul[color='blue']"));
		assert.deepEqual(ul_blue, select(dom, "ul[color*='blue']"));
		assert.deepEqual(ul_blue, select(dom, "ul[color^='blue']"));
		assert.deepEqual(ul_blue, select(dom, "ul[color$='blue']"));
		assert.deepEqual(ul_blue, select(dom, "ul[color~='blue']"));
     });
     test("should return proper elements based on consecutive attribute selectors", function(){
     	assert.deepEqual(li_green, select(dom, "li[type='awesome'][color]"));
     	assert.deepEqual(li_green, select(dom, "#menu li[type='awesome'][color='green']"));
     	assert.deepEqual(li_green, select(dom, "li[type='awesome'][color]"));
     });
     test("should return proper elements based on multiple attribute selectors", function(){
		assert.deepEqual(meta.concat(posts), select(dom, "head meta, #content .post"));
     });
     test("should return proper elements based on multiple consecutive attribute selectors", function(){
     	assert.deepEqual(li_green.concat(meta), select(dom, "li[type='awesome'][color], [content='text/html; charset=utf-8']"));
     	assert.deepEqual(head.concat(ul_blue), select(dom, "head, ul[color='blue']"));
     });
});
