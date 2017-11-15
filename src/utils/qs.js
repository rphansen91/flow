module.exports = {
  get,
  set
}

function set (qs) {
  var query = Object.assign(get(), qs)
  window.location.search = Object.keys(query)
  .map(function (key) {
    return key + '=' + query[key]
  })
  .join('&')
}

function get () {
  return (window.location.search || '')
  .slice(1)
  .split('&')
  .map(function (pair) {
    return pair.split('=')
  })
  .reduce(function (acc, pair) {
    if (!pair[0]) return acc
    acc[pair[0]] = pair[1]
    return acc
  }, {})
}
