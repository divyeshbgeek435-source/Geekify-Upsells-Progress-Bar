(function () {
  var inThemeEditor = Boolean(window.Shopify && window.Shopify.designMode);
  var script = document.currentScript;
  if (!script || !script.dataset || !script.dataset.scePopup) {
    var candidates = document.querySelectorAll("script[data-sce-popup][data-sce-popup-hook]");
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].getAttribute("data-sce-popup-ran") !== "1") {
        script = candidates[i];
        break;
      }
    }
  }
  if (!script || !script.dataset) return;
  script.setAttribute("data-sce-popup-ran", "1");

  var popupDesignIdFilter = String(script.dataset.scePopupDesignId || "").trim();
  var apiUrl = String(script.dataset.apiUrl || "").trim();
  var zIndex = Math.max(1, Number(script.dataset.zIndex || "100000") || 100000);
  var refreshIntervalMs = 5000;
  var lastRenderVersion = "";
  var countdownTimer = null;
  var pendingShowTimeout = null;
  var rootEl = null;

  function dismissStorageKey(designId) {
    return "sce_popup_dismissed_" + String(designId || "").trim();
  }

  function isDismissed(designId) {
    try {
      return sessionStorage.getItem(dismissStorageKey(designId)) === "1";
    } catch (e) {
      return false;
    }
  }

  function markDismissed(designId) {
    try {
      sessionStorage.setItem(dismissStorageKey(designId), "1");
    } catch (_e) {
      /* storage may be unavailable */
    }
  }

  function removePopup() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (rootEl && rootEl.parentNode) {
      rootEl.parentNode.removeChild(rootEl);
    }
    rootEl = null;
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(ev) {
    if (ev.key === "Escape") {
      var cfg = rootEl && rootEl.__scePopupCfg;
      if (cfg) markDismissed(cfg.popupDesignId);
      removePopup();
    }
  }

  function matchesConfigured(cfg) {
    var want = popupDesignIdFilter;
    if (!want) return false;
    var have = String((cfg || {}).popupDesignId || "").trim();
    return have === want;
  }

  var LAYOUT_WHITELIST = {
    split_image_left: 1,
    split_image_right: 1,
    stacked: 1,
    content_only: 1,
  };

  function layoutMode(cfg) {
    var m = String((cfg || {}).layoutMode || "split_image_left").trim();
    return LAYOUT_WHITELIST[m] ? m : "split_image_left";
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function safeImageUrl(url) {
    var s = String(url || "").trim();
    if (!s) return "";
    var lower = s.slice(0, 12).toLowerCase();
    if (
      lower.indexOf("https://") === 0 ||
      lower.indexOf("http://") === 0 ||
      lower.indexOf("//") === 0 ||
      (s.charAt(0) === "/" && s.indexOf("//") !== 0)
    ) {
      return s;
    }
    return "";
  }

  function copyTextToClipboard(text, done) {
    var t = String(text || "");
    function ok() {
      if (typeof done === "function") done(true);
    }
    function fail() {
      if (typeof done === "function") done(false);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(ok).catch(function () {
        try {
          var ta = document.createElement("textarea");
          ta.value = t;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          ok();
        } catch (_e) {
          fail();
        }
      });
      return;
    }
    try {
      var ta2 = document.createElement("textarea");
      ta2.value = t;
      ta2.setAttribute("readonly", "");
      ta2.style.position = "fixed";
      ta2.style.left = "-9999px";
      document.body.appendChild(ta2);
      ta2.select();
      document.execCommand("copy");
      document.body.removeChild(ta2);
      ok();
    } catch (_e2) {
      fail();
    }
  }

  function countdownParts(endAtIso) {
    if (!endAtIso) return null;
    var end = new Date(endAtIso).getTime();
    if (Number.isNaN(end)) return null;
    var now = Date.now();
    var sec = Math.max(0, Math.floor((end - now) / 1000));
    var d = Math.floor(sec / 86400);
    sec -= d * 86400;
    var h = Math.floor(sec / 3600);
    sec -= h * 3600;
    var m = Math.floor(sec / 60);
    sec -= m * 60;
    return { d: pad2(d), h: pad2(h), m: pad2(m), s: pad2(sec) };
  }

  function renderCountdownRow(wrap, endAtIso) {
    wrap.innerHTML = "";
    if (!endAtIso) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "";
    function tick() {
      var p = countdownParts(endAtIso);
      if (!p) return;
      wrap.innerHTML =
        '<span class="sce-popup-countdown__box">' +
        p.d +
        '</span><span class="sce-popup-countdown__box">' +
        p.h +
        '</span><span class="sce-popup-countdown__sep">:</span><span class="sce-popup-countdown__box">' +
        p.m +
        '</span><span class="sce-popup-countdown__sep">:</span><span class="sce-popup-countdown__box">' +
        p.s +
        "</span>";
    }
    tick();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(tick, 1000);
  }

  function buildPopup(cfg) {
    if (!matchesConfigured(cfg)) return null;
    var designId = String(cfg.popupDesignId || "").trim();
    if (!inThemeEditor && isDismissed(designId)) return null;

    var overlay = document.createElement("div");
    overlay.className = "sce-popup-overlay";
    overlay.style.setProperty("--sce-popup-z", String(zIndex));
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var backdrop = document.createElement("div");
    backdrop.className = "sce-popup-overlay__backdrop";
    var dimOn = cfg.dimOverlay !== false;
    backdrop.style.background = dimOn
      ? String(cfg.overlayBg || "rgba(15, 23, 42, 0.45)")
      : "transparent";
    if (!dimOn) {
      overlay.classList.add("sce-popup-overlay--no-dim");
    }

    var modal = document.createElement("div");
    var lay = layoutMode(cfg);
    modal.className = "sce-popup-modal sce-popup-modal--layout-" + lay.replace(/_/g, "-");
    if (cfg.modalTransparentShell === true) {
      modal.classList.add("sce-popup-modal--shell-ghost");
    }
    var br = Number(cfg.modalBorderRadius);
    if (!Number.isNaN(br) && br >= 0) {
      modal.style.borderRadius = String(Math.min(48, br)) + "px";
    }
    var mwp = Number(cfg.modalMaxWidthPx);
    if (!Number.isNaN(mwp) && mwp >= 280 && mwp <= 920) {
      modal.style.width = "min(" + String(Math.round(mwp)) + "px, 100%)";
    }

    var left = null;
    if (lay !== "content_only") {
      left = document.createElement("div");
      left.className = "sce-popup-left";
      left.style.setProperty("--sce-popup-left-bg", String(cfg.leftPanelBg || "#4a7fc4"));
      left.style.setProperty("--sce-popup-gold", String(cfg.accentGold || "#c9a227"));
      left.style.background = String(cfg.leftPanelBg || "#4a7fc4");
      var imgUrl = safeImageUrl(cfg.leftImageUrl);
      if (imgUrl) {
        var img = document.createElement("img");
        img.className = "sce-popup-left__img";
        img.src = imgUrl;
        img.alt = String(cfg.leftImageAlt || "").trim();
        img.loading = "lazy";
        img.decoding = "async";
        left.appendChild(img);
      } else {
        left.innerHTML =
          '<div class="sce-popup-left__orb sce-popup-left__orb--sm"></div>' +
          '<div class="sce-popup-left__orb sce-popup-left__orb--lg"></div>' +
          '<div class="sce-popup-left__pot"></div>' +
          '<div class="sce-popup-left__plant"></div>';
      }
    }

    var right = document.createElement("div");
    right.className = "sce-popup-right";
    right.style.setProperty("--sce-popup-right-bg", String(cfg.rightPanelBg || "#dbeaf8"));
    right.style.setProperty("--sce-popup-headline", String(cfg.headlineColor || "#0f172a"));
    right.style.setProperty("--sce-popup-sub", String(cfg.subheadlineColor || "#475569"));
    right.style.setProperty("--sce-popup-btn-bg", String(cfg.buttonBg || "#0f172a"));
    right.style.setProperty("--sce-popup-btn-fg", String(cfg.buttonText || "#ffffff"));
    right.style.background = String(cfg.rightPanelBg || "#dbeaf8");

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "sce-popup-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function () {
      markDismissed(designId);
      removePopup();
    });

    var h1 = document.createElement("div");
    h1.className = "sce-popup-headline";
    h1.textContent = String(cfg.headline || "");

    var sub = document.createElement("div");
    sub.className = "sce-popup-sub";
    sub.textContent = String(cfg.subheadline || "");

    var cd = document.createElement("div");
    cd.className = "sce-popup-countdown";
    renderCountdownRow(cd, String(cfg.countdownEndAt || "").trim());

    var couponCodeStr = String(cfg.couponCode || "").trim();
    var couponRow = null;
    if (couponCodeStr) {
      couponRow = document.createElement("div");
      couponRow.className = "sce-popup-coupon-row";

      var coupon = document.createElement("div");
      coupon.className = "sce-popup-coupon";
      coupon.textContent = couponCodeStr;

      var copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "sce-popup-copy";
      var copyLabelDefault = String(cfg.copyCouponButtonText || "Copy code");
      var copyLabelDone = String(cfg.copyCouponSuccessText || "Copied!");
      copyBtn.textContent = copyLabelDefault;
      var copyResetTimer = null;
      copyBtn.addEventListener("click", function () {
        copyTextToClipboard(couponCodeStr, function (success) {
          if (!success) return;
          copyBtn.textContent = copyLabelDone;
          if (copyResetTimer) clearTimeout(copyResetTimer);
          copyResetTimer = setTimeout(function () {
            copyBtn.textContent = copyLabelDefault;
            copyResetTimer = null;
          }, 2000);
        });
      });

      couponRow.appendChild(coupon);
      couponRow.appendChild(copyBtn);
    }

    var cta = document.createElement("button");
    cta.type = "button";
    cta.className = "sce-popup-cta";
    cta.textContent = String(cfg.ctaText || "Continue shopping");
    cta.addEventListener("click", function () {
      var href = String(cfg.ctaHref || "").trim();
      if (href) {
        window.location.assign(href);
      } else {
        markDismissed(designId);
        removePopup();
      }
    });

    right.appendChild(closeBtn);
    if (cfg.showHeadline !== false) {
      right.appendChild(h1);
    }
    if (cfg.showSubheadline !== false) {
      right.appendChild(sub);
    }
    right.appendChild(cd);
    if (couponRow) {
      right.appendChild(couponRow);
    }
    right.appendChild(cta);

    if (left) {
      modal.appendChild(left);
    }
    modal.appendChild(right);

    overlay.appendChild(backdrop);
    overlay.appendChild(modal);

    backdrop.addEventListener("click", function () {
      markDismissed(designId);
      removePopup();
    });
    modal.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    overlay.__scePopupCfg = cfg;
    return overlay;
  }

  function mount(cfg) {
    removePopup();
    var el = buildPopup(cfg || {});
    if (!el) return;
    rootEl = el;
    document.body.appendChild(el);
    document.addEventListener("keydown", onKeydown);
  }

  function scheduleShow(cfg) {
    if (pendingShowTimeout) {
      clearTimeout(pendingShowTimeout);
      pendingShowTimeout = null;
    }
    removePopup();
    var delay = Math.max(0, Number(cfg.showDelayMs || 0) || 0);
    if (inThemeEditor) delay = Math.min(delay, 400);
    pendingShowTimeout = setTimeout(function () {
      pendingShowTimeout = null;
      mount(cfg);
    }, delay);
  }

  function refresh() {
    if (!apiUrl) return;
    fetch(apiUrl, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json().then(function (data) {
          return { status: r.status, data: data };
        });
      })
      .then(function (wrapped) {
        if (!wrapped || !wrapped.data || !wrapped.data.ok) {
          removePopup();
          return;
        }
        var data = wrapped.data;
        var cfg = data.config || {};
        if (!matchesConfigured(cfg)) {
          removePopup();
          return;
        }
        var nextVersion = String(data.version || "");
        if (nextVersion && nextVersion === lastRenderVersion) return;
        lastRenderVersion = nextVersion;
        scheduleShow(cfg);
      })
      .catch(function () {});
  }

  refresh();
  setInterval(refresh, refreshIntervalMs);
})();
