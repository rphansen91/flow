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
