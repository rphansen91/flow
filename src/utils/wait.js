module.exports = function (time) {
  return function (val) {
    return new Promise(function (res) {
      setTimeout(function () {
        res(val)
      }, time)
    })
  }
}
