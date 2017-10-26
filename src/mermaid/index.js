var defineGraph = require('./define')

module.exports = function (direction='TD', data) {
  return new Promise(function (res) {
    var level = 0
    var definition = defineGraph(data, level)
    var graph = 'graph ' + direction + '\n' + definition
    // console.log(graph)
    mermaid.render('mermaid', graph, res)
  })
}
