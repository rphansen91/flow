module.exports = function (params) {
  return `function main () {
    return Events({
      from_date: '${params.from_date}',
      to_date: '${params.to_date}',
    })
    .filter(function(event) { return !_.includes(${JSON.stringify(params.exclude)}, event.name) })
    .groupByUser(function(flow, events) {
      flow = flow || { depth: 0 }
      flow.current = flow.current || flow
      for (var i = 0; i < events.length; i++) {
        var e = events[i]
        if (flow.depth === 0 && (e.name != '${params.event}' ${_.reduce(params.filters, function (acc, f) { return acc += ' || e.properties.' + f[0] + ' !== ' + f[1] }, '')})) {
          continue
        }
        if (flow.depth === ${params.depth}) {
          return flow
        }
        flow.depth++
        flow.current[e.name] =
          flow.current[e.name] || {'count': 0, 'events': [], 'next': {}}

        flow.current[e.name].count++
        flow.current[e.name].events = [JSON.parse(JSON.stringify(e.properties))]
        flow.current = flow.current[e.name].next
      }
      return flow
    })
    .map(function(item) {
      delete item.value.depth
      delete item.value.current
      return item.value
    })
    .reduce(merger())
  }

  function merger () {
    return function(accumulators, items) {
      accumulators = fix_reducer_signature(accumulators);
      var ret = {};
      var input = accumulators.concat(items);
      for (var i = 0; i < input.length; ++i) {
        merge(ret, input[i]);
      }
      return ret;
    }
  }
  function merge(d1, d2) {
  for (var key in d2) {
      if (d2.hasOwnProperty(key)) {
          var v1 = d1[key];
          var v2 = d2[key];
          if (!(key in d1)) {
              d1[key] = v2;
        } else if (typeof v1 === "number" && typeof v2 === "number") {
              d1[key] += v2;
        } else if (typeof v1 === "string" && typeof v2 === "string") {
              d1[key] += v2;
        } else if (_.isArray(v1) && _.isArray(v2)) {
              d1[key] = d1[key].concat(v2);
        } else if (typeof v1 === "object" && typeof v2 === "object") {
              merge(v1, v2);
        } else {
              throw new TypeError("Mismatch types for key: " + key + " " + JSON.stringify(v1) + " " + JSON.stringify(v2));
        }
    }
  }
}
  `
}
