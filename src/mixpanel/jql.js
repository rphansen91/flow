function jql (query) {
  return new Promise(function (res) {
    MP.api.jql(query)
    .done(res)
  })
}

module.exports = function (script) {
  return function (params) {
    return jql(script(params))
  }
}
