/*
global canvas, CONFIG, Hooks, Math, window
*/

const MODULE = {
  id: 'vadanx-mobile-controller',
  name: 'Vadanx\'s Mobile Controller',
  icon: 'fas fa-mobile-screen',
  iconView: 'fas fa-eye',
  iconCycleOwnedToken: 'fas fa-arrows-left-right',
  iconOpenCharacterSheet: 'fas fa-address-card',
  iconZoomIn: 'fa fa-magnifying-glass-plus',
  iconZoomOut: 'fas fa-magnifying-glass-minus',
  iconMoveUp: 'fas fa-arrow-up',
  iconMoveDown: 'fas fa-arrow-down',
  iconMoveLeft: 'fas fa-arrow-left',
  iconMoveRight: 'fas fa-arrow-right',
  menu: {
    mobileZoomLevel: {
      name: 'Zoom Level During Mobile View',
      type: Number,
      range: {
        min: 0.1,
        max: 2.0,
        step: 0.1
      },
      default: 1.2,
      scope: 'world',
      config: true,
      requiresReload: true
    }
  },
  viewElements: [
    'hud',
    'notifications',
    'players',
    'ui-bottom',
    'ui-right',
    'ui-top'
  ]
}

let config
let control
let cycledToken
let log
let mobileView = false
let viewElementsDisplayDefault
let viewPositionDefault
let viewZoomDefault

function getViewElementsDisplay () {
  const response = {}
  MODULE.viewElements.forEach(
    k => { response[k] = window.getComputedStyle(document.getElementById(k)).display }
  )
  return response
}

function isDeviceMobile () {
  const x = window.innerWidth * window.devicePixelRatio
  const y = window.innerHeight * window.devicePixelRatio
  if (x < 1024 || y < 700) {
    log.info('Device Is Mobile')
    return true
  }
  log.info('Device Is Not Mobile')
  return false || mobileView
}

function getViewPosition () {
  return {
    x: canvas.stage.pivot.x,
    y: canvas.stage.pivot.y
  }
}

function getViewZoom () {
  return canvas.stage.scale.x
}

function zoomView (adjust) {
  log.info('Zooming View')
  canvas.animatePan(
    {
      scale: Math.max(
        Math.min(
          getViewZoom() + adjust,
          2.0
        ),
        0.1
      )
    }
  )
}

function cycleToken () {
  log.info('Cycling Tokens')
  const ownedTokens = getOwnedTokens()
  let nextIndex = 0
  if (!cycledToken) {
    cycledToken = ownedTokens[nextIndex]
  } else {
    nextIndex = ownedTokens.indexOf(cycledToken) + 1
    if (nextIndex >= ownedTokens.length) {
      nextIndex = 0
    }
    cycledToken = ownedTokens[nextIndex]
  }
  cycledToken.control({ releaseOthers: true })
  canvas.animatePan(cycledToken.center)
}

function switchView () {
  if (mobileView) {
    log.info('Switching View To Default')
    MODULE.viewElements.forEach(k => { document.getElementById(k).style.display = viewElementsDisplayDefault[k] })
    canvas.animatePan({ ...viewPositionDefault, ...{ scale: viewZoomDefault } })
    mobileView = false
  } else {
    log.info('Switching View To Mobile')
    viewElementsDisplayDefault = getViewElementsDisplay()
    viewPositionDefault = getViewPosition()
    viewZoomDefault = getViewZoom()
    if (!cycledToken) {
      cycleToken()
    }
    MODULE.viewElements.forEach(k => { document.getElementById(k).style.display = 'none' })
    canvas.animatePan({ ...cycledToken.center, ...{ scale: config.getMenuValue('mobileZoomLevel') } })
    mobileView = true
  }
}

function getOwnedTokens () {
  return canvas.tokens.placeables.filter(t => t.isOwner)
}

function openCharacterSheet () {
  log.info('Opening Character Sheet')
  if (!cycledToken) {
    cycleToken()
  }
  cycledToken.actor.sheet.render(true)
}

function round (num, step) {
  return Math.ceil(num / step) * step
}

function moveToken (direction) {
  if (!cycledToken) {
    cycleToken()
  }
  const gridSize = canvas.dimensions.size
  const oldPosition = cycledToken.position
  const delta = { x: 0, y: 0 }
  switch (direction) {
    case 'up':
      delta.y -= gridSize
      break
    case 'down':
      delta.y += gridSize
      break
    case 'left':
      delta.x -= gridSize
      break
    case 'right':
      delta.x += gridSize
      break
  }
  cycledToken.document.update(
    {
      x: round(oldPosition._x + delta.x, gridSize),
      y: round(oldPosition._y + delta.y, gridSize)
    },
    {
      animate: true
    }
  )
  canvas.animatePan(
    {
      x: oldPosition._x + (gridSize / 2) + delta.x,
      y: oldPosition._y + (gridSize / 2) + delta.y
    }
  )
}

Hooks.on('vadanx.init', (common) => {
  log = new common.Log(MODULE.id)
  log.debug('Hooked vadanx.init')

  config = new common.Config(MODULE.id)
  config.setMenus(MODULE.menu)

  Hooks.once('ready', () => {
    log.debug('Hooked ready')
    if (isDeviceMobile()) {
      switchView()
    }
  })

  Hooks.on('getSceneControlButtons', (controls) => {
    log.debug('Hooked getSceneControlButtons')
    log.info(CONFIG.Canvas.layers.tokens.layerClass.name)
    control = new common.Control(MODULE.id)
    const controlTools = [
      {
        name: MODULE.id + '-view',
        title: MODULE.name,
        icon: MODULE.icon,
        category: 'token',
        visible: isDeviceMobile(),
        toggle: true,
        active: mobileView || isDeviceMobile(),
        button: true,
        onClick: switchView
      },
      {
        name: MODULE.id + '-sheet',
        title: 'Open Sheet',
        icon: MODULE.iconOpenCharacterSheet,
        category: 'token',
        visible: isDeviceMobile(),
        toggle: false,
        active: false,
        button: true,
        onClick: openCharacterSheet
      },
      {
        name: MODULE.id + '-cycle',
        title: 'Cycle Token',
        icon: MODULE.iconCycleOwnedToken,
        category: 'token',
        visible: isDeviceMobile(),
        toggle: false,
        active: false,
        button: true,
        onClick: cycleToken
      },
      {
        name: MODULE.id + '-zoom-in',
        title: 'Zoom In',
        icon: MODULE.iconZoomIn,
        category: 'token',
        visible: isDeviceMobile(),
        toggle: false,
        active: false,
        button: true,
        onClick: () => { zoomView(0.1) }
      },
      {
        name: MODULE.id + '-zoom-out',
        title: 'Zoom Out',
        icon: MODULE.iconZoomOut,
        category: 'token',
        visible: isDeviceMobile(),
        toggle: false,
        active: false,
        button: true,
        onClick: () => { zoomView(-0.1) }
      },
      {
        name: MODULE.id + '-move-up',
        title: 'Move Up',
        icon: MODULE.iconMoveUp,
        category: 'token',
        visible: isDeviceMobile(),
        toggle: false,
        active: false,
        button: true,
        onClick: () => { moveToken('up') }
      },
      {
        name: MODULE.id + '-move-down',
        title: 'Move Down',
        icon: MODULE.iconMoveDown,
        category: 'token',
        visible: isDeviceMobile(),
        toggle: false,
        active: false,
        button: true,
        onClick: () => { moveToken('down') }
      },
      {
        name: MODULE.id + '-move-left',
        title: 'Move Left',
        icon: MODULE.iconMoveLeft,
        category: 'token',
        visible: isDeviceMobile(),
        toggle: false,
        active: false,
        button: true,
        onClick: () => { moveToken('left') }
      },
      {
        name: MODULE.id + '-move-right',
        title: 'Move Right',
        icon: MODULE.iconMoveRight,
        category: 'token',
        visible: isDeviceMobile(),
        toggle: false,
        active: false,
        button: true,
        onClick: () => { moveToken('right') }
      }
    ]
    controlTools.forEach(
      c => {
        control.create(controls, c)
      }
    )
  })
})
