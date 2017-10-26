module.exports = function define (d, l) {
  if (!d) return ''
  return Object.keys(d)
  .reduce((g, key) => {
    return g + Object.keys(d[key].next || {})
    .map(next => {
      return nodeId(l, key) + nodeContent(key, d[key].count) + ' --> ' + nodeId(l+key, next) + nodeContent(next, d[key].next[next].count) + '\n'
    })
    .join('') + define(d[key].next, l + key)
  }, '')
}

function nodeId (layer, name) {
  return (layer + ' ' + name).replace(/\ /g, '_')
}

function nodeContent (name, count) {
  return '(' + [name, count].join(' ') + ')'
}
