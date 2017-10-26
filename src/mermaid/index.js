var defineGraph = require('./define')

module.exports = function (direction='TD', data) {
  return Promise.resolve()
  .then(function () {
    var level = 0
    var definition = defineGraph(data, level)
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
