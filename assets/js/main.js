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
var flow = require('./mixpanel').flow
var mermaid = require('./mermaid')
var format = require('./utils/format')
var zoom = require('./utils/zoom')
var filterFlow = require('./filters/flow')

$(function () {
  var params = { from: '', to: '', event: '', depth: 3, breadth: 3 }
  $('#datePicker').MPDatepicker().on('change', function(event, range) {
    params.from = range.from
    params.to = range.to
    query()
  })

  $('#eventPicker').MPEventSelect().on('change', function(e, event) {
    params.event = event
    query()
  });

  $('#depthPicker').on('change', function () {
    params.depth = $('#depthPicker').val()
    query()
  })

  $('#breadthPicker').on('change', function () {
    params.breadth = $('#breadthPicker').val()
    query()
  })

  $('#depthPicker').val(params.depth)
  $('#breadthPicker').val(params.breadth)

  var initialDate = $('#datePicker').val()
  params.from = initialDate.from
  params.to = initialDate.to

  function query () {
    if (!valid(params)) return
    visualize(params)
  }

  function valid () {
    return Object.keys(params).every(function (key) {
      return !!params[key]
    })
  }
});

function visualize (params) {
  flow({
    from_date: format.date(params.from),
    to_date: format.date(params.to),
    event: params.event,
    depth: params.depth
  })
  .then(function (data) {
    return data[0]
  })
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
    return mermaid('TD', data)
  })
  .then(render($('#flow')))
}

function render (container$) {
  container$.html('')
  return function (graphic) {
    container$.html(graphic)
    zoom(container$)
  }
}

},{"./filters/flow":1,"./mermaid":4,"./mixpanel":6,"./utils/format":8,"./utils/zoom":9}],3:[function(require,module,exports){
module.exports = function define (d, l) {
  if (!d) return ''
  return Object.keys(d)
  .reduce((g, key) => {
    return g + Object.keys(d[key].next || {})
    .map(next => {
      return nodeId(l, key) + nodeContent(key, d[key].count) + ' --> ' + nodeId(l+key, next) + nodeContent(next, d[key].next[next].count) + '\n'
    })
    .join('') + define(d[key].next, l + key)
  }, '')
}

function nodeId (layer, name) {
  return (layer + ' ' + name).replace(/\ /g, '_')
}

function nodeContent (name, count) {
  return '(' + [name, count].join(' ') + ')'
}

},{}],4:[function(require,module,exports){
var defineGraph = require('./define')

module.exports = function (direction='TD', data) {
  return Promise.resolve()
  .then(function () {
    var level = 0
    var definition = defineGraph(data, level)
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

},{"./define":3}],5:[function(require,module,exports){
module.exports = function (params) {
  return `function main () {
    return Events({
      from_date: '${params.from_date}',
      to_date: '${params.to_date}',
    })
    .filter(function(event) { return event.name != 'User Request' })
    .groupByUser(function(flow, events) {
      flow = flow || { depth: 0 }
      flow.current = flow.current || flow
      for (var i = 0; i < events.length; i++) {
        var e = events[i]
        if (flow.depth === 0 && e.name != '${params.event}') {
          continue
        }
        if (flow.depth === ${params.depth}) {
          return flow
        }
        flow.depth++
        flow.current[e.name] =
          flow.current[e.name] || {'count': 0, 'next': {}}

        flow.current[e.name].count++
        flow.current = flow.current[e.name].next
      }
      return flow
    })
    .map(function(item) {
      delete item.value.depth
      delete item.value.current
      return item.value
    })
    .reduce(mixpanel.reducer.object_merge())
  }`
}

},{}],6:[function(require,module,exports){
var jql = require('./jql')

module.exports = {
  flow: jql(require('./flow'))
}

},{"./flow":5,"./jql":7}],7:[function(require,module,exports){
function jql (query) {
  return new Promise(function (res) {
    MP.api.jql(query)
    .done(res)
  })
}

module.exports = function (script) {
  return function (params) {
    return jql(script(params))
  }
}

},{}],8:[function(require,module,exports){
module.exports.date = function (d) {
  var date = new Date(d)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-')
}

},{}],9:[function(require,module,exports){
module.exports = function (container$) {
  var graphic$ = container$.children().first()
  graphic$.css('max-width', '100%')
  graphic$.panzoom({ minScale: 1 })

  container$.on('mousewheel', function (e) {
    e.preventDefault();
    var delta = e.delta || e.originalEvent.wheelDelta
    var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0
    graphic$.panzoom('zoom', zoomOut, {
      increment: 0.1,
      animate: false,
      focal: e
    })
  })

  container$.on('dblclick', function (e) {
    e.preventDefault()
    graphic$.panzoom('zoom', false, {
      increment: 2,
      animate: true,
      focal: e
    })
  })
}

},{}]},{},[2]);
