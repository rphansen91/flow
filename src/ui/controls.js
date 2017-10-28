module.exports = function (params, changed) {
  var onChange = throttle(changed, 300)
  var range$ = $('#datePicker').MPDatepicker()
  var event$ = $('#eventPicker').MPEventSelect()
  var depth$ = $('#depthPicker')
  var breadth$ = $('#breadthPicker')
  var add$ = $('#add')

  setTimeout(function () {
    // SET DEFAULTS
    range$.val(params)
    event$.val(params.event)
    depth$.val(params.depth)
    breadth$.val(params.breadth)
    _.map(params.filters).map(function (_, i) {
      addFilter(i)
    })

    // LISTENERS
    range$.on('change', setRange)
    event$.on('change', setEvent)
    depth$.on('change', setParam('depth'))
    breadth$.on('change', setParam('breadth'))
    add$.on('click', function () {
      addFilter(params.filters.length)
    })
  }, 1000)

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
    setTimeout(function () {
      group.val(params.filters[i])
    }, 1000)
    group.changed(function (value) {
      params.filters[i] = value
      onChange(params)
    })
    $('#props').append(group[0])
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
  var ls = []
  var group$ = $('<div>').addClass('group')
  var prop$ = $('<div>').addClass('selecter').MPPropertySelect()
  var cont$ = $('<div>').attr('class', 'selecter mixpanel-platform-input-date mixpanel-platform-input')
  var input$ = $('<input>').attr('class', 'rounded_dropdown_label dropdown_label_widget')
  var dispatch = throttle(function () {
    var value = parse()
    ls.map(function (cb) {
      cb(value)
    })
  }, 300)

  prop$.on('change', dispatch)
  input$.on('change', dispatch)
  cont$.append(input$)
  group$.append(prop$).append(cont$).append($('<div>').css('clear', 'both'))

  function parse () {
    var property = prop$.val()
    try {
      var value = eval(input$.val())
      if (typeof value === 'string') value = '"' + value + '"'
      input$.removeClass('error')
      return [property, value]
    } catch (err) {
      input$.addClass('error')
      return [property, null]
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
    }
  }
}
