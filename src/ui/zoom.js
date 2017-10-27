module.exports = function (container$) {
  var graphic$ = container$.children().first()
  graphic$.css('max-width', '100%')
  graphic$.panzoom({ minScale: 1 })

  container$.on('mousewheel', function (e) {
    e.preventDefault();
    var delta = e.delta || e.originalEvent.wheelDelta
    var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0
    graphic$.panzoom('zoom', zoomOut, {
      increment: 0.1,
      animate: false,
      focal: e
    })
  })
}
