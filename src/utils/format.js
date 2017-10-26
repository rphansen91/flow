module.exports.date = function (d) {
  var date = new Date(d)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-')
}
