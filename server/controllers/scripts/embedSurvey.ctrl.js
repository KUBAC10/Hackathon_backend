/* eslint-disable */
import config from '../../../config/env';

function functionBuilder () {
  return function (data) {
    // s - surveyId, t - type of embed, btnL - button label, c - company url name, cId - container Id, i - icon, sp - slider position, w- width, h - height, hH - hide header, hF - hide footer, cmp - company
    const { s, t, btnL, hostname, c, cId, i, sp, w, h, hH, hF, cmp, team } = data;

    const head = document.getElementsByTagName("head")[0]

    // create tag link and set params there
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('type', 'text/css')
    link.setAttribute('href', `${hostname}/embed-styles.css`)

    head.appendChild(link)
    const body = cId ? document.getElementById(cId) : document.getElementsByTagName('body')[0];
    let container = document.createElement('div');
    const iframe = document.createElement('iframe')

    // hide survey footer or header in iframe
    const hideHeader = hH ? `&hideHeader=${hH}` : ''
    const hideFooter = hF ? `&hideFooter=${hF}` : ''

    const answerSurvey = `${hostname}/${c}/${s}?${hideHeader}${hideFooter}`
    const previewSurvey = `${hostname}/survey-preview/?surveyId=${s}&team=${cmp}&company=${team}${hideHeader}${hideFooter}`
    const urlIframe = cId ? previewSurvey : answerSurvey

    iframe.setAttribute('src', `${urlIframe}`)
    iframe.setAttribute('class', 'fullWidth')
    iframe.style.border = '0'

    // function for create button popover
    const createBtnPopover = (picture) => {
      const btn = document.createElement('div')
      btn.setAttribute('class', 'button')
      const img = document.createElement('img')
      img.setAttribute('src', `${hostname}/embed-page/${picture}.svg`)
      img.setAttribute('class', `img`)
      btn.appendChild(img)
      return btn
    }

    const createBtnSidebar = (picture, position) => {
      const btnContainer = document.createElement('div')
      btnContainer.setAttribute('class', 'button-sidebar')
      btnContainer.style.right = position
      const btnContent = document.createElement('div')
      btnContent.setAttribute('class', 'btn-sidebar-content')
      const img = document.createElement('img')
      img.setAttribute('src', `${hostname}/embed-page/${picture}.svg`)
      img.setAttribute('class', `img`)
      // rotate icon to right side
      img.style.transform = 'rotate(90deg)'
      const p = document.createElement('p')
      p.setAttribute('class', 'p-btn-sidebar')
      p.innerHTML = btnL
      btnContent.appendChild(img)
      btnContent.appendChild(p)
      btnContainer.appendChild(btnContent)
      return btnContainer
    }

    // function create close icon for button
    const createCloseButton = () => {
      const img = document.createElement('img')
      img.setAttribute('src', `${hostname}/embed-page/icon-close.svg`)
      img.setAttribute('class', `img`)
      return img
    }

    // create backdrop container for back layout
    const createBackdropContainer = () => {
      const div = document.createElement('div')
      div.setAttribute('class', 'fullWidth')
      div.style.background = 'rgba(19, 27, 47, 0.6)'
      return div
    }

    // function for calculate correct dimensions
    const normalizeStr = (str) => {
      if (str.includes('px')) {
        const num = str.replace(/px/, '')
        return `${num/2}px`
      }
      const num = str.replace(/%/, '')
      return `${num/2}%`
    }

    if (t === 'popover') {
      let btnOpen = createBtnPopover(i)
      let btnClose = createBtnPopover('icon-close')
      body.appendChild(btnOpen)
      container.setAttribute('class', 'popover-container')
      const handleShowIframe = () => {
        container.appendChild(iframe)
        body.appendChild(container)
        body.removeChild(btnOpen)
        body.appendChild(btnClose)
      }
      const handleHideIframe = () => {
        body.removeChild(btnClose)
        body.appendChild(btnOpen)
        body.removeChild(container)
      }

      // event listeners for different buttons and their actions
      btnOpen.addEventListener('click', handleShowIframe)
      btnClose.addEventListener('click', handleHideIframe)
      return true
    }

    if (t === 'sidetab') {
      let openSidebarBtn = createBtnSidebar(i, '0px')
      let closeSidebarBtn = createBtnSidebar('icon-close', '300px')
      body.appendChild(openSidebarBtn)
      container.setAttribute('class', 'sidebar-container')
      const handleShowIframe = () => {
        container.appendChild(iframe)
        body.appendChild(container)
        body.removeChild(openSidebarBtn)
        body.appendChild(closeSidebarBtn)
      }
      const handleHideIframe = () => {
        body.removeChild(closeSidebarBtn)
        body.appendChild(openSidebarBtn)
        body.removeChild(container)
      }
      openSidebarBtn.addEventListener('click', handleShowIframe)
      closeSidebarBtn.addEventListener('click', handleHideIframe)
      return true
    }

    if (t === 'popup') {
      const openBtn = document.getElementById('embed-button')
      const closeBtn = createCloseButton()
      // add backdrop container
      const backdropContainer = createBackdropContainer()
      const handleShowIframe = () => {
        body.appendChild(backdropContainer)
        container.setAttribute('class', 'popup-container')
        container.style.width = w
        container.style.height = h
        container.appendChild(iframe)
        body.appendChild(container)
        closeBtn.setAttribute('class', 'popup-close-btn')

        closeBtn.style.left = `calc(50% + 8px + ${normalizeStr(w)})`
        closeBtn.style.top = `calc(50% + 8px - ${normalizeStr(h)})`
        setTimeout(() => body.appendChild(closeBtn), 0)
      }
      const handleHideIframe = () => {
        body.removeChild(container)
        body.removeChild(closeBtn)
        body.removeChild(backdropContainer)
      }

      openBtn.addEventListener('click', handleShowIframe)
      closeBtn.addEventListener('click', handleHideIframe)
      return true
    }

    if (t === 'slider') {
      const openBtn = document.getElementById('embed-button')
      const closeBtn = createCloseButton()
      // add backdrop container
      const backdropContainer = createBackdropContainer()
      const handleShowIframe = () => {
        body.appendChild(backdropContainer)
        container.setAttribute('class', 'slider-container')
        container.style[sp] = '0'
        container.appendChild(iframe)
        body.appendChild(container)
        closeBtn.setAttribute('class', 'slider-close-btn')
        closeBtn.style[sp] = 'calc(50% + 8px)'
        setTimeout(() => body.appendChild(closeBtn), 0)
      }
      const handleHideIframe = () => {
        body.removeChild(container)
        body.removeChild(closeBtn)
        body.removeChild(backdropContainer)
      }

      openBtn.addEventListener('click', handleShowIframe)
      closeBtn.addEventListener('click', handleHideIframe)
      return true
    }

    // set styles for container
    container.setAttribute('class', 'fullWidth')
    container.appendChild(iframe)
    body.style.margin = '0'
    // append container to body
    body.appendChild(container)
  };
}

// TODO rewrite
function show(req, res, next) {
  try {
    const funcRes = functionBuilder();

    res.set('Content-Type', 'text/javascript');
    res.write(`(${funcRes})(${JSON.stringify({ ...req.query, hostname: `${config.hostname}` })})`);

    return res.end();
  } catch (e) {
    return next(e);
  }
}

export default { show };
