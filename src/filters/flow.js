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
