module.exports = {
  success: display(toastr.success),
  warning: display(toastr.warning),
  error: display(toastr.error),
  info: display(toastr.info)
}


function display (cb) {
  return function (message) {
    if (typeof cb !== 'function') return
    if (typeof message !== 'string') return
    cb(message)
  }
}
