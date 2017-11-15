var qs = require('../utils/qs')

var load = function () {
  var { api_secret } = qs.get()
  if (!api_secret) return Promise.reject(new Error('No api key found'))
  return fetch(`https://lean-feedback.firebaseio.com/flow/${api_secret}.json`)
  .then(res => res.json())
}

var save = function (data) {
  var { api_secret } = qs.get()
  if (!api_secret) return Promise.reject(new Error('No api key found'))
  return fetch(`https://lean-feedback.firebaseio.com/flow/${api_secret}.json`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  .then(() => data)
}

module.exports = {
  load,
  save
}
