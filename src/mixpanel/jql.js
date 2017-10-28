function jql (query) {
  return new Promise(function (res, rej) {
    MP.api.jql(query)
    .done(res)
    .fail(function (err, message) {
      console.log(err)
      rej({ message: err.error || 'Could not execute the given query' })
    })
  })
}

module.exports = function (script) {
  return function (params) {
    return jql(script(params))
  }
}
