(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var pipe = require('../utils/pipe')

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

},{"../utils/pipe":14}],2:[function(require,module,exports){
var canvas = document.getElementById('loader')
var zoom = require('./ui/zoom')
var toast = require('./ui/toast')
var controls = require('./ui/controls')
var loader = require('./ui/loader')(canvas)
var flow = require('./mixpanel').flow
var format = require('./utils/format')
var pipe = require('./utils/pipe')
var hash = require('./utils/hash')
var visualize = require('./visualize')

$(function () {
  var query = hash.get()
  var initial = {
    event: query.event || '',
    from: query.from ? new Date(Number(query.from)) : new Date(),
    to: query.to ? new Date(Number(query.to)) : new Date(),
    depth: Number(query.depth) || 3,
    breadth: Number(query.breadth) || 3,
    filters: query.filters || []
  }

  controls(initial, function (params) {
    console.log(params)
    visualizer(params)
    hash.set(Object.assign({}, params, {
      from: params.from.valueOf(),
      to: params.to.valueOf()
    }))
  })
  .then(function () {
    if (!initial.event) return loader.stop()
    visualizer(initial)
  })
});

function visualizer (params) {
  var labels = initLabels()
  loader.start()

  return flow({
    from_date: format.date(params.from),
    to_date: format.date(params.to),
    event: params.event,
    depth: params.depth,
    filters: params.filters
  })
  .then(function (data) {
    return data[0]
  })
  .then(visualize(params, labels.initLabel))
  .then(render($('#flow')))
  .then(labels.initAll)
  .then(loader.stop)
  .catch(pipe([displayError(), loader.stop]))
}

function render (container$) {
  container$.html('')
  return function (graphic) {
    container$.html(graphic)
    zoom(container$)
  }
}

function displayError () {
  return function (err) {
    console.log(err)
    toast.error(err.message)
  }
}

function initLabels () {
  var labels = []

  return {
    initLabel: function (layer, name, events) {
      labels.push({
        layer,
        name,
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
  var selecter = $('<div>').MPSelect({ items: items })
  selecter.css({ marginTop: 14 })

  element.html('')
  element.append($('<div>').addClass('title').html('<em>' + label.name + '</em>'))
  element.append(chart)
  if (items.length) element.append(selecter)

  handle(items[0] && items[0].value)
  selecter.on('change', function (e, selected) {
    handle(selected)
  })

  function handle (selected) {
    chart.MPChart('setData', label.events.reduce(function (acc, c) {
      var key = c[selected] || label.name
      if (!acc[key]) acc[key] = 0
      acc[key]++
      return acc
    }, {}));
  }
}

function validProp (prop) {
  var ignore = { mp_lib: true }
  return !ignore[prop]
}

},{"./mixpanel":6,"./ui/controls":8,"./ui/loader":9,"./ui/toast":10,"./ui/zoom":11,"./utils/format":12,"./utils/hash":13,"./utils/pipe":14,"./visualize":16}],3:[function(require,module,exports){
module.exports = function define (d, l, fn) {
  if (!d) return ''
  return Object.keys(d)
  .reduce((g, key) => {
    fn(nodeId(l, key), key, d[key].events)
    return g + Object.keys(d[key].next || {})
    .map(next => {
      return nodeId(l, key) + nodeContent(key, d[key].count) + ' --> ' + nodeId(l+key, next) + nodeContent(next, d[key].next[next].count) + '\n'
    })
    .join('') + define(d[key].next, l + key, fn)
  }, '')
}

function nodeId (layer, name) {
  return (layer + ' ' + name)
  .replace(/\//g, '')
  .replace(/\ /g, '_')
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
    if (!definition) throw new Error('Could not build diagram, no data found')
    return 'graph ' + direction + '\n' + definition
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
        if (flow.depth === 0 && (e.name != '${params.event}' ${_.reduce(params.filters, function (acc, f) { return acc += ' || e.properties.' + f[0] + ' !== ' + f[1] }, '')})) {
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
  return new Promise(function (res, rej) {
    MP.api.jql(query)
    .done(res)
    .fail(function (err, message) {
      console.log(err)
      rej({ message: err.error || 'Could not execute the given query' })
    })
  })
}

module.exports = function (script) {
  return function (params) {
    return jql(script(params))
  }
}

},{}],8:[function(require,module,exports){
var wait = require('../utils/wait')

module.exports = function (params, changed) {
  var onChange = throttle(changed, 300)
  var range$ = $('#datePicker').MPDatepicker()
  var event$ = $('#eventPicker').MPEventSelect()
  var depth$ = $('#depthPicker')
  var breadth$ = $('#breadthPicker')
  var add$ = $('#add')

  return Promise.resolve()
  .then(wait(1000))
  .then(function () {
    range$.val(params)
    event$.val(params.event)
    depth$.val(params.depth)
    breadth$.val(params.breadth)
    return Promise.all(_.map(params.filters, function (_, i) {
      return addFilter(i)
    }))
  })
  .then(wait(1000))
  .then(function () {
    // LISTENERS
    range$.on('change', setRange)
    event$.on('change', setEvent)
    depth$.on('change', setParam('depth'))
    breadth$.on('change', setParam('breadth'))
    add$.on('click', function () {
      var i = params.filters.length
      addFilter(i).then(function () {
        console.log('Added')
      })
    })
  })

  function setRange (ev, range) {
    params.from = range.from
    params.to = range.to
    onChange(params)
  }
  function setEvent (ev, event) {
    params.event = event
    params.filters = []
    $('#props').children().remove()
    onChange(params)
  }
  function setParam (name) {
    return function (ev) {
      params[name] = Number($(this).val())
      onChange(params)
    }
  }
  function addFilter (i) {
    var group = inputGroup()
    group.setEvent(params.event)
    $('#props').append(group[0])

    return Promise.resolve()
    .then(wait(1000))
    .then(function () {
      group.val(params.filters[i])
    })
    .then(wait(1000))
    .then(function () {
      group.changed(function (value) {
        params.filters[i] = value
        onChange(params)
      })
      group.removed(function () {
        params.filters.splice(i, 1)
        onChange(params)
      })
    })
  }
}

function throttle (cb, time) {
  var timer
  return function (event) {
    clearTimeout(timer)
    timer = setTimeout(function () {
      cb(event)
    }, time)
  }
}

function inputGroup () {
  var ls = [], rs = []
  var group$ = $('<div>').addClass('group')
  var prop$ = $('<div>').addClass('selecter').MPPropertySelect()
  var cont$ = $('<div>').attr('class', 'selecter mixpanel-platform-input-date mixpanel-platform-input')
  var input$ = $('<input>').attr('class', 'rounded_dropdown_label dropdown_label_widget')
  var remove$ = $('<div>').attr('class', 'selecter del-btn').append($('<i>').attr('class', 'fa fa-trash-o fa-lg'))
  var dispatch = throttle(function () {
    var value = parse()
    ls.map(function (cb) {
      cb(value)
    })
  }, 300)
  var remove = function () {
    group$.remove()
    rs.map(function (cb) { cb() })
  }

  prop$.on('change', dispatch)
  input$.on('change', dispatch)
  remove$.on('click', remove)
  cont$.append(input$)
  group$.append(prop$).append(cont$).append(remove$).append($('<div>').css('clear', 'both'))

  function parse () {
    var property = prop$.val()
    var unparsed = input$.val()
    try {
      var value = eval(unparsed)
      return [property, value]
    } catch (err) {
      return [property, '"' + unparsed + '"']
    }
  }

  return {
    0: group$,
    setEvent: function (event) {
      prop$.MPPropertySelect('setEvent', event)
    },
    val: function (value=[]) {
      if (!value) return parse()
      prop$.val(value[0] || '')
      input$.val(value[1] || '')
    },
    changed: function (cb) {
      if (typeof cb !== 'function') return _.identity
      var index = ls.length
      ls.push(cb)
      return function () {
        ls.splice(index, 1)
      }
    },
    removed: function (cb) {
      if (typeof cb !== 'function') return _.identity
      var index = ls.length
      rs.push(cb)
      return function () {
        rs.splice(index, 1)
      }
    }
  }
}

},{"../utils/wait":15}],9:[function(require,module,exports){
module.exports = function (canvas) {
  return {
    start: start(canvas),
    stop: stop(canvas)
  }
}

function stop (c) {
  return function () {
    $(c).css('display', 'none')
  }
}

function start (c) {
  return function () {
    $(c).css('display', 'inline-block')
  }
}

},{}],10:[function(require,module,exports){
module.exports = {
  success: display(toastr.success),
  warning: display(toastr.warning),
  error: display(toastr.error),
  info: display(toastr.info)
}


function display (cb) {
  return function (message) {
    if (typeof cb !== 'function') return
    if (typeof message !== 'string') return
    cb(message)
  }
}

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
module.exports.date = function (d) {
  var date = new Date(d)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-')
}

},{}],13:[function(require,module,exports){
module.exports = {
  get,
  set
}

function get () {
  try {
    var hash = (window.location.hash || '').slice(1)
    return JSON.parse(hash)
  } catch (err) {
    return {}
  }
}

function set (hash) {
  window.location.hash = JSON.stringify(Object.assign(get(), hash))
}

},{}],14:[function(require,module,exports){
module.exports = function pipe (fns) {
  return function (val) {
    return [].concat(fns).reduce(function (acc, fn) {
      return fn(acc)
    }, val)
  }
}

},{}],15:[function(require,module,exports){
module.exports = function (time) {
  return function (val) {
    return new Promise(function (res) {
      setTimeout(function () {
        res(val)
      }, time)
    })
  }
}

},{}],16:[function(require,module,exports){
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
