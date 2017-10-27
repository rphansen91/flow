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
var zoom = require('./ui/zoom')
var flow = require('./mixpanel').flow
var format = require('./utils/format')
var visualize = require('./visualize')
var worker = new Worker('./assets/js/worker.js')

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
    visualizer(params)
  }

  function valid () {
    return Object.keys(params).every(function (key) {
      return !!params[key]
    })
  }
});

function visualizer (params) {
  var labels = initLabels()

  return flow({
    from_date: format.date(params.from),
    to_date: format.date(params.to),
    event: params.event,
    depth: params.depth
  })
  .then(function (data) {
    return data[0]
  })
  .then(visualize(params, labels.initLabel))
  .then(render($('#flow')))
  .then(labels.initAll)
  .catch(displayError($('#error')))
}

function render (container$) {
  container$.html('')
  return function (graphic) {
    container$.html(graphic)
    zoom(container$)
  }
}

function displayError (container$) {
  return function (err) {
    console.log(err)
  }
}

function initLabels () {
  var labels = []

  return {
    initLabel: function (layer, events) {
      labels.push({
        layer,
        events
      })
    },
    initAll: function () {
      labels.map(function (label) {
        var node = $('#' + label.layer)
        var original = node.attr('class')
        node.on('click', displayEvents(label))
        node.on('mouseenter', setActive(true))
        node.on('mouseleave', setActive(false))

        function setActive (bool) {
          return function () {
            if (bool) {
              node.attr('class', [original, 'active'].join(' '))
            } else {
              node.attr('class', original)
            }
          }
        }
      })
    }
  }
}

function displayEvents (label) {
  return function (event) {
    var element = $('#modal')
    displayLabel(label, element)
    element.modal()
  }
}


function displayLabel (label, element) {
  var keys = _.keys(_.first(label.events)).filter(validProp)
  var items = _.map(keys, function (key) {
    return { value: key, label: key }
  })

  var chart = $('<div>').MPChart({ chartType: 'bar' })
  var selecter = $('<div>').MPSelect({items: items})
  selecter.css({ marginTop: 14 })

  element.html('')
  element.append(chart)
  element.append(selecter)

  handle(items[0] && items[0].value)
  selecter.on('change', function (e, selected) {
    handle(selected)
  })

  function handle (selected) {
    chart.MPChart('setData', label.events.reduce(function (acc, c) {
      if (!acc[c[selected]]) acc[c[selected]] = 0
      acc[c[selected]]++
      return acc
    }, {}));
  }
}

function validProp (prop) {
  var ignore = { mp_lib: true }
  return !ignore[prop]
}

},{"./mixpanel":6,"./ui/zoom":8,"./utils/format":9,"./visualize":10}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
var defineGraph = require('./define')

module.exports = function (direction='TD', data, cb) {
  cb = typeof cb === 'function' ? cb : function () {}
  return Promise.resolve()
  .then(function () {
    var definition = defineGraph(data, '', cb)
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
          flow.current[e.name] || {'count': 0, 'events': [], 'next': {}}

        flow.current[e.name].count++
        flow.current[e.name].events = [JSON.parse(JSON.stringify(e.properties))]
        flow.current = flow.current[e.name].next
      }
      return flow
    })
    .map(function(item) {
      delete item.value.depth
      delete item.value.current
      return item.value
    })
    .reduce(merger())
  }

  function merger () {
    return function(accumulators, items) {
      accumulators = fix_reducer_signature(accumulators);
      var ret = {};
      var input = accumulators.concat(items);
      for (var i = 0; i < input.length; ++i) {
        merge(ret, input[i]);
      }
      return ret;
    }
  }
  function merge(d1, d2) {
  for (var key in d2) {
      if (d2.hasOwnProperty(key)) {
          var v1 = d1[key];
          var v2 = d2[key];
          if (!(key in d1)) {
              d1[key] = v2;
        } else if (typeof v1 === "number" && typeof v2 === "number") {
              d1[key] += v2;
        } else if (typeof v1 === "string" && typeof v2 === "string") {
              d1[key] += v2;
        } else if (_.isArray(v1) && _.isArray(v2)) {
              d1[key] = d1[key].concat(v2);
        } else if (typeof v1 === "object" && typeof v2 === "object") {
              merge(v1, v2);
        } else {
              throw new TypeError("Mismatch types for key: " + key + " " + JSON.stringify(v1) + " " + JSON.stringify(v2));
        }
    }
  }
}
  `
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
}

},{}],9:[function(require,module,exports){
module.exports.date = function (d) {
  var date = new Date(d)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-')
}

},{}],10:[function(require,module,exports){
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

},{"./filters/flow":1,"./mermaid":4}]},{},[2]);
