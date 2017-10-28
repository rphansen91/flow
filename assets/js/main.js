(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var pipe = require('../utils/pipe')

module.exports = function (filters) {
  var modifier = pipe(filters)
  return function filter (d) {
    if (!d) return
    return Object.keys(d)
    .reduce((g, key) => {
      var modified = modifier(d[key].next)
      var next = filter(modified)
      g[key] = d[key]
      g[key].next = next
      return g
    }, {})
  }
}

},{"../utils/pipe":13}],2:[function(require,module,exports){
var canvas = document.getElementById('loader')
var zoom = require('./ui/zoom')
var toast = require('./ui/toast')
var controls = require('./ui/controls')
var loader = require('./ui/loader')(canvas)
var flow = require('./mixpanel').flow
var format = require('./utils/format')
var pipe = require('./utils/pipe')
var qs = require('./utils/qs')
var visualize = require('./visualize')

$(function () {
  var query = qs.get()
  var initial = {
    event: query.event || '',
    from: query.from ? new Date(Number(query.from)) : '',
    to: query.to ? new Date(Number(query.to)) : '',
    depth: Number(query.depth) || 3,
    breadth: Number(query.breadth) || 3,
    filters: query.filters ? JSON.parse(query.filters) : []
  }

  // visualizer(initial)
  controls(initial, function (params) {
    console.log(params)
    visualizer(params)
    qs.set(Object.assign({}, params, {
      from: params.from.valueOf(),
      to: params.to.valueOf(),
      filters: JSON.stringify(params.filters)
    }))
  })
});

function visualizer (params) {
  var labels = initLabels()
  loader.start()

  return flow({
    from_date: format.date(params.from),
    to_date: format.date(params.to),
    event: params.event,
    depth: params.depth,
    filters: params.filters
  })
  .then(function (data) {
    return data[0]
  })
  .then(visualize(params, labels.initLabel))
  .then(render($('#flow')))
  .then(labels.initAll)
  .then(loader.stop)
  .catch(pipe([displayError(), loader.stop]))
}

function render (container$) {
  container$.html('')
  return function (graphic) {
    container$.html(graphic)
    zoom(container$)
  }
}

function displayError () {
  return function (err) {
    console.log(err)
    toast.error(err.message)
  }
}

function initLabels () {
  var labels = []

  return {
    initLabel: function (layer, name, events) {
      labels.push({
        layer,
        name,
        events
      })
    },
    initAll: function () {
      labels.map(function (label) {
        var node = $('#' + label.layer)
        var original = node.attr('class')
        node.on('click', displayEvents(label))
        node.on('mouseenter', setActive(true))
        node.on('mouseleave', setActive(false))

        function setActive (bool) {
          return function () {
            if (bool) {
              node.attr('class', [original, 'active'].join(' '))
            } else {
              node.attr('class', original)
            }
          }
        }
      })
    }
  }
}

function displayEvents (label) {
  return function (event) {
    var element = $('#modal')
    displayLabel(label, element)
    element.modal()
  }
}


function displayLabel (label, element) {
  var keys = _.keys(_.first(label.events)).filter(validProp)
  var items = _.map(keys, function (key) {
    return { value: key, label: key }
  })

  var chart = $('<div>').MPChart({ chartType: 'bar' })
  var selecter = $('<div>').MPSelect({ items: items })
  selecter.css({ marginTop: 14 })

  element.html('')
  element.append($('<div>').addClass('title').html('<em>' + label.name + '</em>'))
  element.append(chart)
  if (items.length) element.append(selecter)

  handle(items[0] && items[0].value)
  selecter.on('change', function (e, selected) {
    handle(selected)
  })

  function handle (selected) {
    chart.MPChart('setData', label.events.reduce(function (acc, c) {
      var key = c[selected] || label.name
      if (!acc[key]) acc[key] = 0
      acc[key]++
      return acc
    }, {}));
  }
}

function validProp (prop) {
  var ignore = { mp_lib: true }
  return !ignore[prop]
}

},{"./mixpanel":6,"./ui/controls":8,"./ui/loader":9,"./ui/toast":10,"./ui/zoom":11,"./utils/format":12,"./utils/pipe":13,"./utils/qs":14,"./visualize":15}],3:[function(require,module,exports){
module.exports = function define (d, l, fn) {
  if (!d) return ''
  return Object.keys(d)
  .reduce((g, key) => {
    fn(nodeId(l, key), key, d[key].events)
    return g + Object.keys(d[key].next || {})
    .map(next => {
      return nodeId(l, key) + nodeContent(key, d[key].count) + ' --> ' + nodeId(l+key, next) + nodeContent(next, d[key].next[next].count) + '\n'
    })
    .join('') + define(d[key].next, l + key, fn)
  }, '')
}

function nodeId (layer, name) {
  return (layer + ' ' + name)
  .replace(/\//g, '')
  .replace(/\ /g, '_')
}

function nodeContent (name, count) {
  return '(' + [name, count].join(' ') + ')'
}

},{}],4:[function(require,module,exports){
var defineGraph = require('./define')

module.exports = function (direction='TD', data, cb) {
  cb = typeof cb === 'function' ? cb : function () {}
  return Promise.resolve()
  .then(function () {
    var definition = defineGraph(data, '', cb)
    if (!definition) throw new Error('Could not build diagram, no data found')
    return 'graph ' + direction + '\n' + definition
  })
  .then(function (graph) {
    return new Promise(function (res) {
      mermaid.render('mermaid', graph, res)
    })
  })
}

},{"./define":3}],5:[function(require,module,exports){
module.exports = function (params) {
  return `function main () {
    return Events({
      from_date: '${params.from_date}',
      to_date: '${params.to_date}',
    })
    .filter(function(event) { return event.name != 'User Request' })
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

},{}],6:[function(require,module,exports){
var jql = require('./jql')

module.exports = {
  flow: jql(require('./flow'))
}

},{"./flow":5,"./jql":7}],7:[function(require,module,exports){
function jql (query) {
  return new Promise(function (res, rej) {
    MP.api.jql(query)
    .done(res)
    .fail(function (err, message) {
      console.log(err)
      rej({ message: err.error || 'Could not execute the given query' })
    })
  })
}

module.exports = function (script) {
  return function (params) {
    return jql(script(params))
  }
}

},{}],8:[function(require,module,exports){
module.exports = function (params, changed) {
  var onChange = throttle(changed, 300)
  var range$ = $('#datePicker').MPDatepicker()
  var event$ = $('#eventPicker').MPEventSelect()
  var depth$ = $('#depthPicker')
  var breadth$ = $('#breadthPicker')
  var add$ = $('#add')

  setTimeout(function () {
    // SET DEFAULTS
    range$.val(params)
    event$.val(params.event)
    depth$.val(params.depth)
    breadth$.val(params.breadth)
    _.map(params.filters).map(function (_, i) {
      addFilter(i)
    })

    // LISTENERS
    range$.on('change', setRange)
    event$.on('change', setEvent)
    depth$.on('change', setParam('depth'))
    breadth$.on('change', setParam('breadth'))
    add$.on('click', function () {
      addFilter(params.filters.length)
    })
  }, 1000)

  function setRange (ev, range) {
    params.from = range.from
    params.to = range.to
    onChange(params)
  }
  function setEvent (ev, event) {
    params.event = event
    params.filters = []
    $('#props').children().remove()
    onChange(params)
  }
  function setParam (name) {
    return function (ev) {
      params[name] = Number($(this).val())
      onChange(params)
    }
  }
  function addFilter (i) {
    var group = inputGroup()
    group.setEvent(params.event)
    setTimeout(function () {
      group.val(params.filters[i])
    }, 1000)
    group.changed(function (value) {
      params.filters[i] = value
      onChange(params)
    })
    $('#props').append(group[0])
  }
}

function throttle (cb, time) {
  var timer
  return function (event) {
    clearTimeout(timer)
    timer = setTimeout(function () {
      cb(event)
    }, time)
  }
}

function inputGroup () {
  var ls = []
  var group$ = $('<div>').addClass('group')
  var prop$ = $('<div>').addClass('selecter').MPPropertySelect()
  var cont$ = $('<div>').attr('class', 'selecter mixpanel-platform-input-date mixpanel-platform-input')
  var input$ = $('<input>').attr('class', 'rounded_dropdown_label dropdown_label_widget')
  var dispatch = throttle(function () {
    var value = parse()
    ls.map(function (cb) {
      cb(value)
    })
  }, 300)

  prop$.on('change', dispatch)
  input$.on('change', dispatch)
  cont$.append(input$)
  group$.append(prop$).append(cont$).append($('<div>').css('clear', 'both'))

  function parse () {
    var property = prop$.val()
    try {
      var value = eval(input$.val())
      if (typeof value === 'string') value = '"' + value + '"'
      input$.removeClass('error')
      return [property, value]
    } catch (err) {
      input$.addClass('error')
      return [property, null]
    }
  }

  return {
    0: group$,
    setEvent: function (event) {
      prop$.MPPropertySelect('setEvent', event)
    },
    val: function (value=[]) {
      if (!value) return parse()
      prop$.val(value[0] || '')
      input$.val(value[1] || '')
    },
    changed: function (cb) {
      if (typeof cb !== 'function') return _.identity
      var index = ls.length
      ls.push(cb)
      return function () {
        ls.splice(index, 1)
      }
    }
  }
}

},{}],9:[function(require,module,exports){
module.exports = function (canvas) {
  render(canvas)
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

function render (c) {
  var w = c.width = window.innerWidth,
  h = c.height = window.innerHeight,
  ctx = c.getContext( '2d' ),

  opts = {

    range: 180,
    baseConnections: 3,
    addedConnections: 5,
    baseSize: 5,
    minSize: 1,
    dataToConnectionSize: .4,
    sizeMultiplier: .7,
    allowedDist: 40,
    baseDist: 40,
    addedDist: 30,
    connectionAttempts: 100,

    dataToConnections: 1,
    baseSpeed: .04,
    addedSpeed: .05,
    baseGlowSpeed: .4,
    addedGlowSpeed: .4,

    rotVelX: .003,
    rotVelY: .002,

    repaintColor: '#fff',
    connectionColor: 'hsla(200,60%,light%,alp)',
    rootColor: 'hsla(0,60%,light%,alp)',
    endColor: 'hsla(160,20%,light%,alp)',
    dataColor: 'hsla(40,80%,light%,alp)',

    wireframeWidth: .4,
    wireframeColor: '#88f',

    depth: 250,
    focalLength: 250,
    vanishPoint: {
      x: w / 2,
      y: h / 2
    }
  },

  squareRange = opts.range * opts.range,
  squareAllowed = opts.allowedDist * opts.allowedDist,
  mostDistant = opts.depth + opts.range,
  sinX = sinY = 0,
  cosX = cosY = 0,

  connections = [],
  toDevelop = [],
  data = [],
  all = [],
  tick = 0,
  totalProb = 0,

  animating = false,

  Tau = Math.PI * 2;

  ctx.fillStyle = '#fff';
  ctx.fillRect( 0, 0, w, h );
  ctx.fillStyle = '#fff';
  ctx.font = '50px Verdana';
  ctx.fillText( 'Calculating Nodes', w / 2 - ctx.measureText( 'Calculating Nodes' ).width / 2, h / 2 - 15 );

  window.setTimeout( init, 4 ); // to render the loading screen

  function init(){

  connections.length = 0;
  data.length = 0;
  all.length = 0;
  toDevelop.length = 0;

  var connection = new Connection( 0, 0, 0, opts.baseSize );
  connection.step = Connection.rootStep;
  connections.push( connection );
  all.push( connection );
  connection.link();

  while( toDevelop.length > 0 ){

  toDevelop[ 0 ].link();
  toDevelop.shift();
  }

  if( !animating ){
  animating = true;
  anim();
  }
  }
  function Connection( x, y, z, size ){

  this.x = x;
  this.y = y;
  this.z = z;
  this.size = size;

  this.screen = {};

  this.links = [];
  this.probabilities = [];
  this.isEnd = false;

  this.glowSpeed = opts.baseGlowSpeed + opts.addedGlowSpeed * Math.random();
  }
  Connection.prototype.link = function(){

  if( this.size < opts.minSize )
  return this.isEnd = true;

  var links = [],
    connectionsNum = opts.baseConnections + Math.random() * opts.addedConnections |0,
    attempt = opts.connectionAttempts,

    alpha, beta, len,
    cosA, sinA, cosB, sinB,
    pos = {},
    passedExisting, passedBuffered;

  while( links.length < connectionsNum && --attempt > 0 ){

  alpha = Math.random() * Math.PI;
  beta = Math.random() * Tau;
  len = opts.baseDist + opts.addedDist * Math.random();

  cosA = Math.cos( alpha );
  sinA = Math.sin( alpha );
  cosB = Math.cos( beta );
  sinB = Math.sin( beta );

  pos.x = this.x + len * cosA * sinB;
  pos.y = this.y + len * sinA * sinB;
  pos.z = this.z + len *        cosB;

  if( pos.x*pos.x + pos.y*pos.y + pos.z*pos.z < squareRange ){

    passedExisting = true;
    passedBuffered = true;
    for( var i = 0; i < connections.length; ++i )
      if( squareDist( pos, connections[ i ] ) < squareAllowed )
        passedExisting = false;

    if( passedExisting )
      for( var i = 0; i < links.length; ++i )
        if( squareDist( pos, links[ i ] ) < squareAllowed )
          passedBuffered = false;

    if( passedExisting && passedBuffered )
      links.push( { x: pos.x, y: pos.y, z: pos.z } );

  }

  }

  if( links.length === 0 )
  this.isEnd = true;
  else {
  for( var i = 0; i < links.length; ++i ){

    var pos = links[ i ],
        connection = new Connection( pos.x, pos.y, pos.z, this.size * opts.sizeMultiplier );

    this.links[ i ] = connection;
    all.push( connection );
    connections.push( connection );
  }
  for( var i = 0; i < this.links.length; ++i )
    toDevelop.push( this.links[ i ] );
  }
  }
  Connection.prototype.step = function(){

  this.setScreen();
  this.screen.color = ( this.isEnd ? opts.endColor : opts.connectionColor ).replace( 'light', 30 + ( ( tick * this.glowSpeed ) % 30 ) ).replace( 'alp', .2 + ( 1 - this.screen.z / mostDistant ) * .8 );

  for( var i = 0; i < this.links.length; ++i ){
  ctx.moveTo( this.screen.x, this.screen.y );
  ctx.lineTo( this.links[ i ].screen.x, this.links[ i ].screen.y );
  }
  }
  Connection.rootStep = function(){
  this.setScreen();
  this.screen.color = opts.rootColor.replace( 'light', 30 + ( ( tick * this.glowSpeed ) % 30 ) ).replace( 'alp', ( 1 - this.screen.z / mostDistant ) * .8 );

  for( var i = 0; i < this.links.length; ++i ){
  ctx.moveTo( this.screen.x, this.screen.y );
  ctx.lineTo( this.links[ i ].screen.x, this.links[ i ].screen.y );
  }
  }
  Connection.prototype.draw = function(){
  ctx.fillStyle = this.screen.color;
  ctx.beginPath();
  ctx.arc( this.screen.x, this.screen.y, this.screen.scale * this.size, 0, Tau );
  ctx.fill();
  }
  function Data( connection ){

  this.glowSpeed = opts.baseGlowSpeed + opts.addedGlowSpeed * Math.random();
  this.speed = opts.baseSpeed + opts.addedSpeed * Math.random();

  this.screen = {};

  this.setConnection( connection );
  }
  Data.prototype.reset = function(){

  this.setConnection( connections[ 0 ] );
  this.ended = 2;
  }
  Data.prototype.step = function(){

  this.proportion += this.speed;

  if( this.proportion < 1 ){
  this.x = this.ox + this.dx * this.proportion;
  this.y = this.oy + this.dy * this.proportion;
  this.z = this.oz + this.dz * this.proportion;
  this.size = ( this.os + this.ds * this.proportion ) * opts.dataToConnectionSize;
  } else
  this.setConnection( this.nextConnection );

  this.screen.lastX = this.screen.x;
  this.screen.lastY = this.screen.y;
  this.setScreen();
  this.screen.color = opts.dataColor.replace( 'light', 40 + ( ( tick * this.glowSpeed ) % 50 ) ).replace( 'alp', .2 + ( 1 - this.screen.z / mostDistant ) * .6 );

  }
  Data.prototype.draw = function(){

  if( this.ended )
  return --this.ended; // not sre why the thing lasts 2 frames, but it does

  ctx.beginPath();
  ctx.strokeStyle = this.screen.color;
  ctx.lineWidth = this.size * this.screen.scale;
  ctx.moveTo( this.screen.lastX, this.screen.lastY );
  ctx.lineTo( this.screen.x, this.screen.y );
  ctx.stroke();
  }
  Data.prototype.setConnection = function( connection ){

  if( connection.isEnd )
  this.reset();

  else {

  this.connection = connection;
  this.nextConnection = connection.links[ connection.links.length * Math.random() |0 ];

  this.ox = connection.x; // original coordinates
  this.oy = connection.y;
  this.oz = connection.z;
  this.os = connection.size; // base size

  this.nx = this.nextConnection.x; // new
  this.ny = this.nextConnection.y;
  this.nz = this.nextConnection.z;
  this.ns = this.nextConnection.size;

  this.dx = this.nx - this.ox; // delta
  this.dy = this.ny - this.oy;
  this.dz = this.nz - this.oz;
  this.ds = this.ns - this.os;

  this.proportion = 0;
  }
  }
  Connection.prototype.setScreen = Data.prototype.setScreen = function(){

  var x = this.x,
    y = this.y,
    z = this.z;

  // apply rotation on X axis
  var Y = y;
  y = y * cosX - z * sinX;
  z = z * cosX + Y * sinX;

  // rot on Y
  var Z = z;
  z = z * cosY - x * sinY;
  x = x * cosY + Z * sinY;

  this.screen.z = z;

  // translate on Z
  z += opts.depth;

  this.screen.scale = opts.focalLength / z;
  this.screen.x = opts.vanishPoint.x + x * this.screen.scale;
  this.screen.y = opts.vanishPoint.y + y * this.screen.scale;

  }
  function squareDist( a, b ){

  var x = b.x - a.x,
    y = b.y - a.y,
    z = b.z - a.z;

  return x*x + y*y + z*z;
  }

  function anim(){

  window.requestAnimationFrame( anim );

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = opts.repaintColor;
  ctx.fillRect( 0, 0, w, h );

  ++tick;

  var rotX = tick * opts.rotVelX,
    rotY = tick * opts.rotVelY;

  cosX = Math.cos( rotX );
  sinX = Math.sin( rotX );
  cosY = Math.cos( rotY );
  sinY = Math.sin( rotY );

  if( data.length < connections.length * opts.dataToConnections ){
  var datum = new Data( connections[ 0 ] );
  data.push( datum );
  all.push( datum );
  }

  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.lineWidth = opts.wireframeWidth;
  ctx.strokeStyle = opts.wireframeColor;
  all.map( function( item ){ item.step(); } );
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  all.sort( function( a, b ){ return b.screen.z - a.screen.z } );
  all.map( function( item ){ item.draw(); } );

  /*ctx.beginPath();
  ctx.strokeStyle = 'red';
  ctx.arc( opts.vanishPoint.x, opts.vanishPoint.y, opts.range * opts.focalLength / opts.depth, 0, Tau );
  ctx.stroke();*/
  }

  window.addEventListener( 'resize', function(){

  opts.vanishPoint.x = ( w = c.width = window.innerWidth ) / 2;
  opts.vanishPoint.y = ( h = c.height = window.innerHeight ) / 2;
  ctx.fillRect( 0, 0, w, h );
  });
}

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
module.exports.date = function (d) {
  var date = new Date(d)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-')
}

},{}],13:[function(require,module,exports){
module.exports = function pipe (fns) {
  return function (val) {
    return [].concat(fns).reduce(function (acc, fn) {
      return fn(acc)
    }, val)
  }
}

},{}],14:[function(require,module,exports){
module.exports = {
  get,
  set
}

function set (qs) {
  var query = Object.assign(get(), qs)
  window.location.hash = Object.keys(query)
  .map(function (key) {
    return key + '=' + query[key]
  })
  .join('&')
}

function get () {
  return (window.location.hash || '')
  .slice(1)
  .split('&')
  .map(function (pair) {
    return pair.split('=')
  })
  .reduce(function (acc, pair) {
    if (!pair[0]) return acc
    acc[pair[0]] = pair[1]
    return acc
  }, {})
}

},{}],15:[function(require,module,exports){
var filterFlow = require('./filters/flow')
var mermaid = require('./mermaid')

module.exports = function (params, nodeCb) {
  return function (data) {
    return Promise.resolve(data)
    .then(filterFlow(function (events) {
      return Object.keys(events)
      .sort(function (a, b) {
        return events[b].count - events[a].count
      })
      .slice(0, params.breadth) // TAKE TOP 3 EVENTS
      .reduce(function (acc, c) {
        acc[c] = events[c]
        return acc
      }, {})
    }))
    .then(function (data) {
      return mermaid('TD', data, nodeCb)
    })
  }
}

},{"./filters/flow":1,"./mermaid":4}]},{},[2]);
