(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function (filters) {
  var modifier = pipe(filters)
  return function filter (d) {
    if (!d) return
    return Object.keys(d)
    .reduce((g, key) => {
      var modified = modifier(d[key].next)
      var next = filter(modified)
      g[key] = d[key]
      g[key].next = next
      return g
    }, {})
  }
}

function pipe (fns) {
  return function (val) {
    return [].concat(fns).reduce(function (acc, fn) {
      return fn(acc)
    }, val)
  }
}

},{}],2:[function(require,module,exports){
module.exports = function define (d, l, fn) {
  if (!d) return ''
  return Object.keys(d)
  .reduce((g, key) => {
    fn(nodeId(l, key), d[key].events)
    return g + Object.keys(d[key].next || {})
    .map(next => {
      return nodeId(l, key) + nodeContent(key, d[key].count) + ' --> ' + nodeId(l+key, next) + nodeContent(next, d[key].next[next].count) + '\n'
    })
    .join('') + define(d[key].next, l + key, fn)
  }, '')
}

function nodeId (layer, name) {
  return (layer + ' ' + name).replace(/\ /g, '_')
}

function nodeContent (name, count) {
  return '(' + [name, count].join(' ') + ')'
}

},{}],3:[function(require,module,exports){
var defineGraph = require('./define')

module.exports = function (direction='TD', data, cb) {
  cb = typeof cb === 'function' ? cb : function () {}
  return Promise.resolve()
  .then(function () {
    var level = 0
    var definition = defineGraph(data, level, cb)
    return 'graph ' + direction + '\n' + definition
  })
  .then(function (graph) {
    mermaid.parse(graph)
    return graph
  })
  .then(function (graph) {
    return new Promise(function (res) {
      mermaid.render('mermaid', graph, res)
    })
  })
}

},{"./define":2}],4:[function(require,module,exports){
var filterFlow = require('./filters/flow')
var mermaid = require('./mermaid')

module.exports = function (params, nodeCb) {
  return function (data) {
    return Promise.resolve(data)
    .then(filterFlow(function (events) {
      return Object.keys(events)
      .sort(function (a, b) {
        return events[b].count - events[a].count
      })
      .slice(0, params.breadth) // TAKE TOP 3 EVENTS
      .reduce(function (acc, c) {
        acc[c] = events[c]
        return acc
      }, {})
    }))
    .then(function (data) {
      return mermaid('TD', data, nodeCb)
    })
  }
}

},{"./filters/flow":1,"./mermaid":3}],5:[function(require,module,exports){
importScripts('//unpkg.com/mermaid@7.1.0/dist/mermaid.min.js')

var visualize = require('./visualize')
onmessage = function (e) {
  console.log('Message received from main script', e)
  var params = e.data[0]
  var data = e.data[1]
  visualize(params)(data)
  .then(function (res) {
    console.log('RESULT', res)
    postMessage({ result: res })
  })
  .catch(function (err) {
    console.log(err)
    postMessage({ error: err.message })
  })
}

},{"./visualize":4}]},{},[5]);
