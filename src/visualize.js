var filterFlow = require('./filters/flow')
var mermaid = require('./mermaid')

module.exports = function (params, nodeCb) {
  return function (data) {
    return Promise.resolve(data)
    .then(filterFlow(function (events) {
      return Object.keys(events)
      .sort(function (a, b) {
        return events[b].count - events[a].count
      })
      .slice(0, params.breadth) // TAKE TOP 3 EVENTS
      .reduce(function (acc, c) {
        acc[c] = events[c]
        return acc
      }, {})
    }))
    .then(function (data) {
      return mermaid('TD', data, nodeCb)
    })
  }
}
