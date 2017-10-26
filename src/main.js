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
