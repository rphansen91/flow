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
