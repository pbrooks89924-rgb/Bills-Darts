(function () {
  var count = 0;

  function overlay() {
    var node = document.getElementById("busy");
    if (node) return node;
    node = document.createElement("div");
    node.id = "busy";
    node.className = "busy";
    node.hidden = true;
    node.innerHTML = '<div class="spin" role="status" aria-label="Loading"></div>';
    document.body.appendChild(node);
    return node;
  }

  function setBusy(on) {
    count += on ? 1 : -1;
    if (count < 0) count = 0;
    overlay().hidden = count === 0;
  }

  var orig = window.fetch;
  window.fetch = function (input) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var sheet = url.indexOf("script.google.com") !== -1;
    if (!sheet) return orig.apply(this, arguments);
    setBusy(true);
    return Promise.resolve(orig.apply(this, arguments)).then(function (res) {
      setBusy(false);
      return res;
    }, function (err) {
      setBusy(false);
      throw err;
    });
  };
})();
