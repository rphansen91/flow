module.exports.date = function (d) {
  var date = new Date(d)
  var str = [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-')
  console.log(date, str)
  return str
}
