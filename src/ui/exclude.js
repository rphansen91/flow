require('mixpanel-common')
require('./draggable')

module.exports = function (element) {
  $(document).on('click', '.excluder', function () {
    var event = $(this).attr('node-name')
    if (event) add(event)
  })

  function add (event) {
    element[0].helpers.addTag(event)
  }

  function val (newValue) {
    return Array.from(element[0].state.selectedTags)
  }

  element.add = add
  element.val = val
  return element
}
