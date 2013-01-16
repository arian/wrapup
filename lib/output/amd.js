"use strict";

var path      = require('path')
var fs        = require('fs')
var prime     = require('prime')
var mkdirp    = require('mkdirp')
var escodegen = require('escodegen')
var Promise   = require('promise')
var all       = require('then-all')
var util      = require('../util')
var errors    = require('../errors')

var relative = function(from, to){
    var file = path.dirname(from) == path.dirname(to) ?
        './' + path.relative(path.dirname(from), to) :
        path.relative(from, to)
    return (path.extname(file) == '.js') ? file.slice(0, -3) : file
}

var uid = 0;

var output = prime({

    inherits: require('./'),

    up: function(){
        var self = this
        return new Promise(function(resolver){
            if (self._options.output) resolver.fulfill()
            else resolver.reject(new errors.RequiredOutputError())
        }).then(function(){
            return util.getAST('amd-module')
        }).then(function(ast){
            return self.output(ast)
        })
    },

    output: function(defineAST){

        var self    = this
        var modules = this.modules
        var output  = this._options.output
        var byID    = {}
        var tasks   = []

        prime.each(modules, function(module, full){
            byID[module.uid] = module
            var file = util.relative(full)
            // rename modules if the files are out of scope
            if (file.slice(0, 2) == '..'){
                self.wrup.emit("warn", new errors.OutOfScopeError(full))
                file = '__oos/' + (uid++) + '-' + path.basename(full)
            }
            module.file = file
        })

        prime.each(modules, function(module){

            var file = module.file

            var define = util.clone(defineAST)
            var ast = module.ast
            var body = define.body[0].expression['arguments'][1].body.body

            // put the module JS into the module function
            for (var i = 0; i < ast.body.length; i++){
                body.push(ast.body[i])
            }

            // the AMD dependencies array, and "factory" parameters
            var deps = define.body[0].expression['arguments'][0].elements
            var params = define.body[0].expression['arguments'][1].params

            var paths = {}

            // replace require calls.
            module.requires.forEach(function(req, i){
                var dep = byID[module.deps[i]]
                if (!dep) return

                var path = relative(file, dep.file)
                var param = paths[path]

                // add to AMD dependency array, if necessary
                if (!paths[path]){
                    param = (paths[path] = '__' + i.toString(36))
                    deps.push({type: "Literal", value: path})
                    params.push({type: "Identifier", name: param})
                }

                req.parent[req.key] = {type: "Identifier", name: param}
            })

            var code = escodegen.generate(define)
            var filename = path.normalize(output + '/' + file)

            tasks.push(new Promise(function(resolver){
                mkdirp(dir, function(err){
                    if (err) return resolver.reject(err)
                    fs.writeFile(filename, code, function(err){
                        if (err) return resolver.reject(err)
                        self.wrup.emit("output", filename)
                        resolver.fulfill()
                    })
                })
            }))

        })

        return tasks.length ? all(tasks) : null
    }

})

module.exports = function(wrup){
    return new output(wrup).up()
}
