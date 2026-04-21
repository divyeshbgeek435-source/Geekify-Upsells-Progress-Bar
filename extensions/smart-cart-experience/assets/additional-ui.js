(function () {
  var inThemeEditor = Boolean(window.Shopify && window.Shopify.designMode);
  var script = document.currentScript;
  if (!script || !script.dataset || !script.dataset.sceExtra) {
    var candidates = document.querySelectorAll("script[data-sce-extra][data-sce-extra-hook]");
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].getAttribute("data-sce-extra-ran") !== "1") {
        script = candidates[i];
        break;
      }
    }
  }
  if (!script || !script.dataset) return;
  script.setAttribute("data-sce-extra-ran", "1");

  var hookId = String(script.dataset.sceExtraHook || "").trim();
  var blockId = String(script.dataset.sceExtraBlockId || "").trim() || hookId;
  var sectionIdFilter = String(script.dataset.sceExtraSectionId || "").trim();
  var placement = String(script.dataset.placement || "inline")
    .trim()
    .toLowerCase();
  var apiUrl = String(script.dataset.apiUrl || "").trim();
  var zIndex = Math.max(1, Number(script.dataset.zIndex || "1000") || 1000);
  var refreshIntervalMs = 5000;
  var lastRenderVersion = "";
  var rotateTimer = null;
  var rotateState = { idx: 0 };
  var hasRenderedAtLeastOnce = false;

  function removeExisting() {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
    document
      .querySelectorAll('[data-sce-extra-root="' + blockId + '"], [data-sce-extra-spacer="' + blockId + '"]')
      .forEach(function (el) {
        el.remove();
      });
  }

  function normalizeItems(messages) {
    var raw = Array.isArray(messages) ? messages : [];
    var items = [];
    for (var j = 0; j < raw.length; j++) {
      var row = raw[j];
      var text = "";
      if (row && typeof row === "object") {
        text = String(row.text || row.message || "").trim();
      } else {
        text = String(row || "").trim();
      }
      if (text) items.push(text);
    }
    if (!items.length) items = ["BLACK FRIDAY SALE!"];
    return items;
  }

  /** Bar renders only when the theme block Section ID is set and equals the app marquee sectionId. */
  function matchesConfiguredSection(cfg) {
    var want = sectionIdFilter;
    if (!want) return false;
    var have = String((cfg || {}).sectionId || "").trim();
    return have === want;
  }

  function renderRotateMessage(track, items, fontSizePx) {
    track.innerHTML = "";
    var span = document.createElement("span");
    span.className = "sce-extra-bar__item";
    span.style.fontSize = fontSizePx + "px";
    span.textContent = items[rotateState.idx] || "";
    track.appendChild(span);
  }

  function startRotateTimer(track, items, fontSizePx, rotateDirection, rotateIntervalMs) {
    if (rotateTimer || items.length <= 1) return;
    rotateTimer = setInterval(function () {
      rotateState.idx =
        rotateDirection === "backward"
          ? (rotateState.idx - 1 + items.length) % items.length
          : (rotateState.idx + 1) % items.length;
      renderRotateMessage(track, items, fontSizePx);
    }, rotateIntervalMs);
  }

  function stopRotateTimer() {
    if (!rotateTimer) return;
    clearInterval(rotateTimer);
    rotateTimer = null;
  }

  function buildNode(cfg) {
    if (!matchesConfiguredSection(cfg)) return null;
    var items = normalizeItems((cfg || {}).messages);
    if (!items.length) return null;
    var gapPx = Math.max(8, Number(cfg.gapPx || 24) || 24);
    var fontSizePx = Math.max(12, Number(cfg.fontSizePx || 22) || 22);
    var paddingYpx = Math.max(0, Number(cfg.paddingYpx || 14) || 14);
    var paddingXpx = Math.max(0, Number(cfg.paddingXpx || 16) || 16);
    var borderRadiusPx = Math.max(0, Number(cfg.borderRadiusPx || 8) || 8);
    var bg = String(cfg.backgroundColor || "#B8F441").trim();
    var fg = String(cfg.textColor || "#0F172A").trim();
    var displayMode = String(cfg.displayMode || "stack");
    var rotateIntervalMs = Math.max(1000, Number(cfg.rotateIntervalMs || 3000) || 3000);
    var rotateDirection = String(cfg.rotateDirection || "forward") === "backward" ? "backward" : "forward";
    var rotateAutoplay = cfg.rotateAutoplay !== false;
    var rotatePauseOnHover = cfg.rotatePauseOnHover !== false;
    var enablePauseOnHover = rotatePauseOnHover && !inThemeEditor;
    var marqueeDurationSeconds = Math.max(4, Number(cfg.marqueeDurationSeconds || 18) || 18);
    var marqueeDirection = String(cfg.marqueeDirection || "rtl") === "ltr" ? "ltr" : "rtl";
    var marqueeSeparator = String(cfg.marqueeSeparator || "•");
    var marqueeSeparatorRepeat = Math.max(
      1,
      Math.min(6, Number(cfg.marqueeSeparatorRepeat || 1) || 1),
    );
    var marqueeTrailingSeparator = cfg.marqueeTrailingSeparator !== false;

    var root = document.createElement("div");
    root.className = "sce-extra-bar " + (placement === "sticky" ? "sce-extra-bar--sticky" : "sce-extra-bar--inline");
    root.setAttribute("data-sce-extra-root", blockId);
    var marqueeSectionId = String((cfg || {}).sectionId || "").trim();
    if (marqueeSectionId) {
      root.setAttribute("data-sce-marquee-section-id", marqueeSectionId);
    }
    root.style.background = bg;
    root.style.color = fg;
    root.style.padding = paddingYpx + "px " + paddingXpx + "px";
    root.style.borderRadius = borderRadiusPx + "px";
    if (placement === "sticky") root.style.zIndex = String(zIndex);

    var wrap = document.createElement("div");
    wrap.className = "sce-extra-bar__track-wrap";
    var track = document.createElement("div");
    track.className = "sce-extra-bar__track";
    track.style.gap = gapPx + "px";

    if (displayMode === "marquee") {
      wrap.classList.add("sce-extra-bar__track-wrap--marquee");
      track.classList.add("sce-extra-bar__track--marquee");
      track.style.animationDuration = marqueeDurationSeconds + "s";
      track.style.animationDirection = marqueeDirection === "ltr" ? "reverse" : "normal";
      track.style.gap = "0px";
      var sepToken = marqueeSeparator.repeat(marqueeSeparatorRepeat);
      var sep = " " + sepToken + " ";
      var baseText = items.join(sep);
      var marqueeText = marqueeTrailingSeparator ? baseText + sep : baseText;
      var spanM1 = document.createElement("span");
      spanM1.className = "sce-extra-bar__item";
      spanM1.style.fontSize = fontSizePx + "px";
      spanM1.textContent = marqueeText;
      var spanM2 = document.createElement("span");
      spanM2.className = "sce-extra-bar__item";
      spanM2.style.fontSize = fontSizePx + "px";
      spanM2.textContent = marqueeText;
      track.appendChild(spanM1);
      track.appendChild(spanM2);
    } else if (displayMode === "rotate") {
      rotateState.idx = 0;
      renderRotateMessage(track, items, fontSizePx);
      if (rotateAutoplay) {
        // Force immediate first transition so autoplay is visibly working.
        setTimeout(function () {
          if (!rotateTimer) {
            rotateState.idx =
              rotateDirection === "backward"
                ? (rotateState.idx - 1 + items.length) % items.length
                : (rotateState.idx + 1) % items.length;
            renderRotateMessage(track, items, fontSizePx);
          }
          startRotateTimer(track, items, fontSizePx, rotateDirection, rotateIntervalMs);
        }, Math.min(rotateIntervalMs, 1200));
      }
      if (enablePauseOnHover) {
        root.addEventListener("mouseenter", function () {
          stopRotateTimer();
        });
        root.addEventListener("mouseleave", function () {
          if (!rotateAutoplay) return;
          startRotateTimer(track, items, fontSizePx, rotateDirection, rotateIntervalMs);
        });
      }
    } else {
      for (var i = 0; i < items.length; i++) {
        var span = document.createElement("span");
        span.className = "sce-extra-bar__item";
        span.style.fontSize = fontSizePx + "px";
        span.textContent = items[i];
        track.appendChild(span);
      }
    }

    wrap.appendChild(track);
    root.appendChild(wrap);
    return root;
  }

  function render(cfg) {
    removeExisting();
    var root = buildNode(cfg || {});
    if (!root) return;
    var hook = hookId ? document.getElementById(hookId) : null;
    if (placement === "sticky") {
      document.body.insertBefore(root, document.body.firstChild);
      var spacer = document.createElement("div");
      spacer.className = "sce-extra-bar__spacer";
      spacer.setAttribute("data-sce-extra-spacer", blockId);
      spacer.style.setProperty("--sce-extra-height", root.offsetHeight + "px");
      spacer.style.height = root.offsetHeight + "px";
      document.body.insertBefore(spacer, root.nextSibling);
      return;
    }

    if (!hook) return;
    hook.innerHTML = "";
    hook.style.minHeight = "";
    hook.appendChild(root);
    hasRenderedAtLeastOnce = true;
  }

  function refresh() {
    if (!apiUrl) {
      render({});
      return;
    }
    fetch(apiUrl, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json().then(function (data) {
          return { status: r.status, data: data };
        });
      })
      .then(function (wrapped) {
        if (!wrapped || !wrapped.data || !wrapped.data.ok) {
          if (!hasRenderedAtLeastOnce) render({});
          return;
        }
        var data = wrapped.data;
        var nextVersion = String(data.version || "");
        if (nextVersion && nextVersion === lastRenderVersion) return;
        render(data.config || {});
        lastRenderVersion = nextVersion;
      })
      .catch(function () {
        if (!hasRenderedAtLeastOnce) render({});
      });
  }

  refresh();
  setInterval(refresh, refreshIntervalMs);
})();
