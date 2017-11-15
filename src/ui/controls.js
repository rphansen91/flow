var wait = require('../utils/wait')
var format = require('../utils/format')
var exclude = require('./exclude')
var bookmarks = require('./bookmarks')

module.exports = function (params, changed) {
  var onChange = throttle(changed, 300)
  var range$ = $('#datePicker').MPDatepicker()
  var event$ = $('#eventPicker').MPEventSelect()
  var depth$ = $('#depthPicker')
  var breadth$ = $('#breadthPicker')
  var add$ = $('#add')
  var exclude$ = exclude($('mp-tag-selector'))
  var bookmarks$ = bookmarks($('mp-bookmarks-widget'))
  return initialize()

  function initialize () {
    return Promise.resolve()
    .then(wait(1000))
    .then(function () {
      range$.val({
        from: new Date(params.from),
        to: new Date(params.to),
      })
      event$.val(params.event)
      depth$.val(params.depth)
      breadth$.val(params.breadth)
      _.forEach(params.exclude, event => {
        exclude$.add(event)
      });
      return Promise.all(_.map(params.filters, function (_, i) {
        return addFilter(i)
      }))
    })
    .then(wait(1000))
    .then(function () {
      // LISTENERS
      exclude$[0].addEventListener('change', setExclude)
      exclude$[0].addEventListener('save', setExclude)
      bookmarks$[0].addEventListener('submit', setBookmark)
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
  }

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
  function setExclude (ev) {
    const newExclude = exclude$.val()
    if (JSON.stringify(params.exclude) !== JSON.stringify(newExclude)) {
      params.exclude = newExclude
      onChange(params)
    }
  }
  function setBookmark (ev) {
    console.log('set bookmark', ev)
    switch (ev.detail.action) {
      case "create": return bookmarks$.add(ev.detail.name, params)
      case "delete": return bookmarks$.remove(ev.detail.bookmarkId)
      case "confirm": return bookmarks$.confirm()
      case "cancel": return bookmarks$.cancel()
      case "select":
        params = ev.detail.value.value
        return initialize()
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
