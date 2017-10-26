module.exports = function (params) {
  return `function main () {
    return Events({
      from_date: '${params.from_date}',
      to_date: '${params.to_date}',
    })
    .filter(function(event) { return event.name != 'User Request' })
    .groupByUser(function(flow, events) {
      flow = flow || { depth: 0 }
      flow.current = flow.current || flow
      for (var i = 0; i < events.length; i++) {
        var e = events[i]
        if (flow.depth === 0 && e.name != '${params.event}') {
          continue
        }
        if (flow.depth === ${params.depth}) {
          return flow
        }
        flow.depth++
        flow.current[e.name] =
          flow.current[e.name] || {'count': 0, 'next': {}}

        flow.current[e.name].count++
        flow.current = flow.current[e.name].next
      }
      return flow
    })
    .map(function(item) {
      delete item.value.depth
      delete item.value.current
      return item.value
    })
    .reduce(mixpanel.reducer.object_merge())
  }`
}
