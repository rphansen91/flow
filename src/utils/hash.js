module.exports = {
  get,
  set
}

function get () {
  try {
    var hash = (window.location.hash || '').slice(1)
    return JSON.parse(hash)
  } catch (err) {
    return {}
  }
}

function set (hash) {
  window.location.hash = JSON.stringify(Object.assign(get(), hash))
}
