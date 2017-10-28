module.exports = function (canvas) {
  return {
    start: start(canvas),
    stop: stop(canvas)
  }
}

function stop (c) {
  return function () {
    $(c).css('display', 'none')
  }
}

function start (c) {
  return function () {
    $(c).css('display', 'inline-block')
  }
}
