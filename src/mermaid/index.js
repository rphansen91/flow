var defineGraph = require('./define')

module.exports = function (direction='TD', data, cb) {
  cb = typeof cb === 'function' ? cb : function () {}
  return Promise.resolve()
  .then(function () {
    var definition = defineGraph(data, '', cb)
    return 'graph ' + direction + '\n' + definition
  })
  .then(function (graph) {
    mermaid.parse(graph)
    return graph
  })
  .then(function (graph) {
    return new Promise(function (res) {
      mermaid.render('mermaid', graph, res)
    })
  })
}
