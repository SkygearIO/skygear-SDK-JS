function initCurrentInfo(target) {
  var el = target || document.querySelector('#current-info')

  el.innerHTML = "<div><h2>Current Information</h2><div style=\"padding: 20px\" class=\"border border-grey\"><div class=\"row row\"><div class=\"col\">Endpoint</div><div id=\"endpoint\" class=\"col-8\"></div></div><div class=\"row row\"><div class=\"col\">API Key</div><div id=\"api-key\" class=\"col-8\"></div></div><div class=\"row row\"><div class=\"col\">Username</div><div id=\"username\" class=\"col-8\"></div></div><div class=\"row row\"><div class=\"col\">Email</div><div id=\"email\" class=\"col-8\"></div></div><div class=\"row row\"><div class=\"col\">Access token</div><div id=\"token\" class=\"col-8\" style=\"word-break: break-all;\"></div></div></div></div>"

  function refreshCurrentInfo() {
    el.querySelector('#endpoint').innerText = skygear.endPoint
    el.querySelector('#api-key').innerText = skygear.apiKey
    el.querySelector('#token').innerText = skygear.auth.accessToken
    if (skygear.auth.currentUser) {
      el.querySelector('#username').innerText = skygear.auth.currentUser.username || ''
      el.querySelector('#email').innerText = skygear.auth.currentUser.email || ''
    } else {
      el.querySelector('#username').innerText = ''
      el.querySelector('#email').innerText = ''
    }
  }

  refreshCurrentInfo()
  skygear.auth.onUserChanged(refreshCurrentInfo)
}
