(function () {
  var ITEM = 48;

  function mount(el) {
    if (el.dataset.ready) return;
    el.dataset.ready = "1";
    var max = Math.max(0, Number(el.dataset.max) || 0);
    var count = max + 1;
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

    function wrap(value) {
      return ((value % count) + count) % count;
    }

    scroller.appendChild(pad());
    for (var copy = 0; copy < 3; copy++) {
      for (var n = 0; n <= max; n++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "score-n";
        btn.dataset.n = String(n);
        btn.textContent = String(n);
        btn.addEventListener("click", onPick(n));
        scroller.appendChild(btn);
      }
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

    function buttons() {
      return scroller.querySelectorAll(".score-n");
    }

    function paint(value) {
      value = wrap(value);
      el.dataset.value = String(value);
      scroller.setAttribute("aria-valuenow", String(value));
      var prev = wrap(value - 1);
      var next = wrap(value + 1);
      var nodes = buttons();
      for (var i = 0; i < nodes.length; i++) {
        var n = Number(nodes[i].dataset.n);
        nodes[i].classList.toggle("is-on", n === value);
        nodes[i].classList.toggle("is-near", count > 1 && (n === prev || n === next) && n !== value);
      }
      var field = input();
      if (field) field.value = String(value);
    }

    var lock = false;
    function place(index, animate) {
      lock = true;
      scroller.scrollTo({ top: index * ITEM, behavior: animate ? "smooth" : "auto" });
      window.setTimeout(function () { lock = false; }, animate ? 320 : 40);
    }

    function setValue(value, animate) {
      value = wrap(value);
      var nodes = buttons();
      var best = count + value;
      var bestDist = Infinity;
      for (var i = 0; i < nodes.length; i++) {
        if (Number(nodes[i].dataset.n) !== value) continue;
        var dist = Math.abs(i * ITEM - scroller.scrollTop);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      paint(value);
      place(best, animate);
      if (best < count || best >= count * 2) {
        window.setTimeout(function () {
          lock = true;
          scroller.scrollTop = (count + value) * ITEM;
          window.setTimeout(function () { lock = false; }, 40);
        }, animate ? 330 : 50);
      }
    }

    function onPick(value) {
      return function () { setValue(value, true); };
    }

    var wheelLock = false;
    scroller.addEventListener("wheel", function (event) {
      event.preventDefault();
      if (wheelLock) return;
      var dir = event.deltaY > 0 || event.deltaX > 0 ? 1 : -1;
      if (!event.deltaY && !event.deltaX) return;
      wheelLock = true;
      setValue((Number(el.dataset.value) || 0) + dir, true);
      window.setTimeout(function () { wheelLock = false; }, 160);
    }, { passive: false });

    var timer = 0;
    scroller.addEventListener("scroll", function () {
      if (lock) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        var nodes = buttons();
        var index = Math.round(scroller.scrollTop / ITEM);
        if (index < 0) index = 0;
        if (index >= nodes.length) index = nodes.length - 1;
        var n = Number(nodes[index].dataset.n);
        paint(n);
        if (index < count || index >= count * 2) {
          lock = true;
          scroller.scrollTop = (count + n) * ITEM;
          window.setTimeout(function () { lock = false; }, 40);
        }
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
    lock = true;
    scroller.scrollTop = (count + start) * ITEM;
    window.setTimeout(function () { lock = false; }, 40);
  }

  window.initWheels = function (root) {
    var scope = root || document;
    var wheels = scope.querySelectorAll(".score-wheel");
    for (var i = 0; i < wheels.length; i++) mount(wheels[i]);
  };
})();
