soupselect = require "../lib/soupselect"
htmlparser = require 'htmlparser2'

fs = require "fs"

index = fs.readFileSync './index.html', 'utf8'

parse = (html) ->
  handler = new htmlparser.DefaultHandler()
  parser = new htmlparser.Parser handler
  
  parser.includeLocation = false
  parser.parseComplete html
  
  return handler.dom

dom = parse index

console.log soupselect.select dom, 'title'
