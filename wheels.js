(function () {
  var ITEM = 48;

  function mount(el) {
    if (el.dataset.ready) return;
    el.dataset.ready = "1";
    var max = Math.max(0, Number(el.dataset.max) || 0);
    var start = Math.min(max, Math.max(0, Number(el.dataset.value) || 0));
    var scroller = document.createElement("div");
    scroller.className = "score-scroll";
    scroller.tabIndex = 0;
    scroller.setAttribute("role", "spinbutton");
    scroller.setAttribute("aria-valuemin", "0");
    scroller.setAttribute("aria-valuemax", String(max));
    scroller.setAttribute("aria-label", el.dataset.label || "Score");

    function pad() {
      var node = document.createElement("div");
      node.className = "score-pad";
      return node;
    }

    scroller.appendChild(pad());
    for (var n = 0; n <= max; n++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "score-n";
      btn.textContent = String(n);
      btn.addEventListener("click", onPick(n));
      scroller.appendChild(btn);
    }
    scroller.appendChild(pad());

    var band = document.createElement("div");
    band.className = "score-band";
    el.appendChild(scroller);
    el.appendChild(band);

    function input() {
      var card = el.closest("[data-id]");
      return card ? card.querySelector("." + el.dataset.target) : null;
    }

    function paint(value) {
      el.dataset.value = String(value);
      scroller.setAttribute("aria-valuenow", String(value));
      var nodes = scroller.querySelectorAll(".score-n");
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle("is-on", i === value);
      var field = input();
      if (field) field.value = String(value);
    }

    var lock = false;
    function setValue(value, animate) {
      value = Math.min(max, Math.max(0, value));
      lock = true;
      scroller.scrollTo({ top: value * ITEM, behavior: animate ? "smooth" : "auto" });
      paint(value);
      window.setTimeout(function () { lock = false; }, animate ? 280 : 40);
    }

    function onPick(value) {
      return function () { setValue(value, true); };
    }

    var timer = 0;
    scroller.addEventListener("scroll", function () {
      if (lock) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        var next = Math.min(max, Math.max(0, Math.round(scroller.scrollTop / ITEM)));
        paint(next);
      }, 70);
    }, { passive: true });

    scroller.addEventListener("keydown", function (event) {
      var now = Number(el.dataset.value) || 0;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setValue(now + 1, true);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setValue(now - 1, true);
      }
    });

    paint(start);
    scroller.scrollTop = start * ITEM;
  }

  window.initWheels = function (root) {
    var scope = root || document;
    var wheels = scope.querySelectorAll(".score-wheel");
    for (var i = 0; i < wheels.length; i++) mount(wheels[i]);
  };
})();
