"use strict";

var fs      = require('fs')
var esprima = require('esprima')
var assert  = require('assert')
var path    = require('path')

require("colors")

var parse = function(file){
    var code = fs.readFileSync(file, "utf-8")
    return esprima.parse(code)
}

var relative = function(file){
    return path.relative(process.cwd(), file)
}

var passed = 0
// expected number of exports.passed calls
var expected = 10

exports.passed = function(test){
    passed++
    console.log(("✔ " + test + " test passed").green)
}

exports.test = function(test){
    var result = __dirname + '/output/' + test + '.result.js'
    var should = __dirname + '/output/' + test + '.js'
    var resultAST = parse(result)
    var shouldAST = parse(should)
    assert.deepEqual(resultAST, shouldAST, relative(result) + " and " + relative(should) + " should be the same")
    exports.passed(test)
}

require('./up')
require('./pipe')
require('./globalize')
require('./notresolved')
require('./compress')
require('./ast')
require('./graph')
require('./sourcemap')
require('./wrup')

process.on("SIGINT", function(){
    process.exit()
})
process.on("exit", function(){
    assert.equal(passed, expected, "all tests should pass")
    exports.passed("all tests")
})
