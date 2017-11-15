function storage (fn) {
  return function (val) {
    return new Promise(function (res, rej) {
      try {
        res(fn(val))
      } catch (err) {
        rej(err)
      }
    })
  }
}

var load = storage(function () {
  return JSON.parse(localStorage.getItem('bookmarks'))
})

var save = storage(function (v) {
  localStorage.setItem('bookmarks', JSON.stringify(v))
  return v
})

module.exports = {
  load,
  save
}
