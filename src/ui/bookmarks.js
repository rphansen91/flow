require('mixpanel-common')
// var { load, save } = require('../storage/local')
var { load, save } = require('../storage/fb')

module.exports = function (element) {
  var removeId

  load().then(defined).then(render).catch(err => console.log('Bookmarks', err))
  var addBm = (name, value) => edit(function (bms) {
    return [].concat(bms).concat({ id: name, name, value })
  })

  var removeBm = (id) => edit(function (bms) {
    return [].concat(bms).filter(b => b.id !== removeId)
  })

  function edit (cb) {
    return load()
    .then(defined)
    .then(cb)
    .then(defined)
    .then(save)
    .then(render)
  }

  function render (bms) {
    element[0].setAttribute('bookmarks', JSON.stringify(bms || []))
  }

  function loader (bool) {
    element[0].setAttribute('saving', bool)
  }

  function defined (arr) {
    return (arr || []).filter(v => v && v.id && v.name)
  }

  function confirm () {
    if (!removeId) return
    return removeBm(removeId)
  }

  function cancel () {
    removeId = null
  }

  function add (name, value) {
    return addBm(name, value)
    .then(() => {
      loader(false)
      return value
    })
    .catch(() => {
      loader(false)
      return value
    })
  }

  function remove (id) {
    removeId = id
  }

  element.add = add
  element.remove = remove
  element.confirm = confirm
  element.cancel = cancel
  element.save = save
  element.load = load
  return element
}
