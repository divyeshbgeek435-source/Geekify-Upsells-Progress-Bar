(function () {
  var inThemeEditor = Boolean(window.Shopify && window.Shopify.designMode);

  function findPopupScript() {
    var s = document.currentScript;
    if (s && s.hasAttribute && s.hasAttribute("data-sce-popup")) return s;
    var auto = document.querySelectorAll('script[data-sce-popup][data-sce-popup-auto="1"]');
    for (var a = 0; a < auto.length; a++) {
      if (auto[a].getAttribute("data-sce-popup-ran") !== "1") return auto[a];
    }
    var hooked = document.querySelectorAll("script[data-sce-popup][data-sce-popup-hook]");
    for (var h = 0; h < hooked.length; h++) {
      if (hooked[h].getAttribute("data-sce-popup-ran") !== "1") return hooked[h];
    }
    return null;
  }

  var script = findPopupScript();
  if (!script || !script.dataset) return;
  var dedupeId = String(script.dataset.scePopupDesignId || "").trim();
  var dedupeKey = "__scePopupSingleton_" + (dedupeId || "default");
  try {
    if (window[dedupeKey]) return;
    window[dedupeKey] = 1;
  } catch (_d) {
    /* ignore */
  }
  script.setAttribute("data-sce-popup-ran", "1");
  try {
    window.__scePopupScriptLoaded = true;
  } catch (_loaded) {}

  var popupDesignIdFilter = String(script.dataset.scePopupDesignId || "").trim();
  var apiUrl = String(script.dataset.apiUrl || "").trim();
  var isAuto = String(script.dataset.scePopupAuto || "").trim() === "1";
  var zIndex = Math.max(1, Number(script.dataset.zIndex || "100000") || 100000);
  var refreshIntervalMs = 3000;
  var lastTickSig = "";
  /** Closed this page load (theme editor + storefront); cleared only on full navigation/reload. */
  var sessionDismissed = {};
  var countdownTimer = null;
  var pendingShowTimeout = null;
  var rootEl = null;

  function isDismissedThisSession(cfg) {
    var id = String((cfg || {}).popupDesignId || "").trim();
    return Boolean(id && sessionDismissed[id]);
  }

  function dismissStorageKey(designId) {
    return "sce_popup_dismissed_" + String(designId || "").trim();
  }

  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_e) {
      return null;
    }
  }

  function lsSet(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch (_e) {
      /* ignore */
    }
  }

  function impressionKey(designId) {
    return "sce_popup_imp_" + String(designId || "").trim();
  }

  function onceKey(designId) {
    return "sce_popup_once_" + String(designId || "").trim();
  }

  function suppressUntilKey(designId) {
    return "sce_popup_suppress_" + String(designId || "").trim();
  }

  function getImpressionCount(designId) {
    var n = Number(lsGet(impressionKey(designId)) || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function bumpImpressionCount(designId) {
    var k = impressionKey(designId);
    var n = getImpressionCount(designId) + 1;
    lsSet(k, String(n));
  }

  function normalizePageTarget(raw) {
    var t = String(raw || "all").trim();
    if (t === "all" || t === "home" || t === "exact") return t;
    if (t === "custom" || t === "url") return "exact";
    return "all";
  }

  function readPageType() {
    var fromScript = String(script.dataset.scePageType || "").trim().toLowerCase();
    if (fromScript) return fromScript;
    var tagged = document.querySelector("script[data-sce-popup][data-sce-page-type]");
    if (tagged) {
      return String(tagged.getAttribute("data-sce-page-type") || "").trim().toLowerCase();
    }
    return "";
  }

  function getExactPageUrl(cfg) {
    var raw = String((cfg || {}).exactPageUrl || (cfg || {}).customPathContains || "").trim();
    if (!raw) return "";
    return normalizeStorefrontPath(raw);
  }

  function stripOptionalLocalePrefix(pathnameNorm) {
    var path = normalizeStorefrontPath(pathnameNorm);
    var parts = path.split("/").filter(Boolean);
    if (parts.length > 1 && /^[a-z]{2}(-[a-z]{2})?$/.test(parts[0])) {
      return "/" + parts.slice(1).join("/");
    }
    return path;
  }

  function storefrontPathsEqual(pathnameRaw, exactRaw) {
    var path = normalizeStorefrontPath(pathnameRaw);
    var exact = normalizeStorefrontPath(exactRaw);
    if (!exact || exact === "/") return false;
    if (path === exact) return true;
    return stripOptionalLocalePrefix(path) === exact;
  }

  /** Prefer API top-level targeting over stale template fields in data.config. */
  function applyServerTargeting(cfg, data) {
    var out = Object.assign({}, cfg || {});
    if (!data) return out;
    if (data.pageTarget != null && String(data.pageTarget).trim() !== "") {
      out.pageTarget = normalizePageTarget(data.pageTarget);
    } else {
      out.pageTarget = normalizePageTarget(out.pageTarget);
    }
    if (out.pageTarget === "exact") {
      var exactRaw =
        data.exactPageUrl != null && String(data.exactPageUrl).trim() !== ""
          ? data.exactPageUrl
          : out.exactPageUrl || out.customPathContains || "";
      out.exactPageUrl = normalizeStorefrontPath(exactRaw);
    } else {
      out.exactPageUrl = "";
    }
    return out;
  }

  function isValidEmailForCapture(v) {
    var s = String(v || "").trim();
    if (!s || s.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function normalizeStorefrontPath(raw) {
    var path = String(raw || "/").trim() || "/";
    if (/^https?:\/\//i.test(path)) {
      try {
        path = new URL(path).pathname;
      } catch (_url) {
        /* keep raw */
      }
    }
    if (path.charAt(0) !== "/") path = "/" + path;
    path = path.toLowerCase().split("?")[0].split("#")[0];
    if (path.length > 1 && path.charAt(path.length - 1) === "/") {
      path = path.replace(/\/+$/, "");
    }
    return path || "/";
  }

  function isHome(path, pageType) {
    var normalized = normalizeStorefrontPath(path);
    return pageType === "index" || normalized === "/" || normalized === "";
  }

  /** One rule at a time: all | home (index or /) | exact path. */
  function matchesPageTarget(cfg) {
    var target = normalizePageTarget((cfg || {}).pageTarget);
    var path = normalizeStorefrontPath(window.location.pathname || "/");
    var pageType = readPageType();

    if (target === "all") return true;

    if (target === "home") {
      return isHome(path, pageType);
    }

    if (target === "exact") {
      return storefrontPathsEqual(path, getExactPageUrl(cfg));
    }

    return false;
  }

  function isSuppressed(cfg) {
    if (isDismissedThisSession(cfg)) return true;
    if (inThemeEditor) return false;
    var id = String((cfg || {}).popupDesignId || "").trim();
    if (!id) return true;
    var maxI = Number((cfg || {}).maxImpressions);
    if (Number.isFinite(maxI) && maxI > 0 && getImpressionCount(id) >= maxI) return true;
    var mode = String((cfg || {}).showMode || "repeat").trim();
    if (mode === "once") {
      if (lsGet(onceKey(id)) === "1") return true;
    } else {
      var until = Number(lsGet(suppressUntilKey(id)) || 0);
      if (until > Date.now()) return true;
    }
    try {
      if (sessionStorage.getItem(dismissStorageKey(id)) === "1") return true;
    } catch (_e) {}
    return false;
  }

  function markDismissed(cfg) {
    var id = String((cfg || {}).popupDesignId || "").trim();
    if (!id) return;
    sessionDismissed[id] = true;
    if (pendingShowTimeout) {
      clearTimeout(pendingShowTimeout);
      pendingShowTimeout = null;
    }
    if (inThemeEditor) return;
    var mode = String((cfg || {}).showMode || "repeat").trim();
    var repeatMs = Math.max(60000, (Number((cfg || {}).repeatFrequencyMinutes) || 60) * 60000);
    try {
      if (mode === "once") {
        lsSet(onceKey(id), "1");
        lsSet(suppressUntilKey(id), "0");
      } else {
        lsSet(suppressUntilKey(id), String(Date.now() + repeatMs));
      }
      sessionStorage.removeItem(dismissStorageKey(id));
    } catch (_e) {
      try {
        sessionStorage.setItem(dismissStorageKey(id), "1");
      } catch (_e2) {}
    }
  }

  function removePopup() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    try {
      if (rootEl && rootEl.__sceAutoCloseTimer) {
        clearTimeout(rootEl.__sceAutoCloseTimer);
        rootEl.__sceAutoCloseTimer = null;
      }
    } catch (_t) {}
    if (rootEl && rootEl.parentNode) {
      rootEl.parentNode.removeChild(rootEl);
    }
    rootEl = null;
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(ev) {
    if (ev.key === "Escape") {
      var cfg = rootEl && rootEl.__scePopupCfg;
      if (cfg) markDismissed(cfg);
      removePopup();
    }
  }

  function alternateShortPath(primaryBase) {
    var b = String(primaryBase || "").trim();
    if (b.indexOf("/apps/sce/") !== 0) return "";
    return b.slice("/apps/sce".length) || "/";
  }

  function uniqueStrings(list) {
    var out = [];
    var seen = {};
    for (var i = 0; i < list.length; i++) {
      var s = String(list[i] || "").trim();
      if (!s || seen[s]) continue;
      seen[s] = true;
      out.push(s);
    }
    return out;
  }

  function popupQueryString() {
    var parts = [];
    if (popupDesignIdFilter) {
      parts.push("popup_design_id=" + encodeURIComponent(popupDesignIdFilter));
    }
    var path = String(window.location.pathname || "/") || "/";
    parts.push("page_path=" + encodeURIComponent(path));
    var pageType = readPageType();
    if (pageType) parts.push("page_type=" + encodeURIComponent(pageType));
    return parts.join("&");
  }

  function popupFetchUrls() {
    var qs = popupQueryString();
    var primary = String(apiUrl || "").trim() || "/apps/sce/popup-design";
    var bases = uniqueStrings([primary, alternateShortPath(primary), "/apps/sce/popup-design"]);
    return bases.map(function (base) {
      var sep = base.indexOf("?") >= 0 ? "&" : "?";
      return base + sep + qs;
    });
  }

  function matchesConfigured(cfg) {
    var want = popupDesignIdFilter;
    if (!want) return true;
    var have = String((cfg || {}).popupDesignId || "").trim();
    return have === want;
  }

  var LAYOUT_WHITELIST = {
    split_image_left: 1,
    split_image_right: 1,
    stacked: 1,
    content_only: 1,
  };

  var STYLE_WHITELIST = { classic: 1, glass: 1, minimal: 1, editorial: 1 };

  function layoutMode(cfg) {
    var m = String((cfg || {}).layoutMode || "split_image_left").trim();
    return LAYOUT_WHITELIST[m] ? m : "split_image_left";
  }

  function visualStyle(cfg) {
    var s = String((cfg || {}).visualStyle || "classic").trim();
    return STYLE_WHITELIST[s] ? s : "classic";
  }

  var CLOSE_POS_WHITELIST = { top_left: 1, top_right: 1, bottom_left: 1, bottom_right: 1 };

  function closeButtonPosition(cfg) {
    var p = String((cfg || {}).closeButtonPosition || "top_right").trim().replace(/-/g, "_");
    return CLOSE_POS_WHITELIST[p] ? p : "top_right";
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

  function renderCountdownRow(wrap, endAtIso, cfg) {
    wrap.innerHTML = "";
    if (!endAtIso) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "";
    var labeled = String((cfg || {}).countdownStyle || "").trim() === "labeled";
    function unitHtml(val, lbl) {
      return (
        '<div class="sce-popup-countdown__unit">' +
        '<span class="sce-popup-countdown__box">' +
        val +
        '</span><span class="sce-popup-countdown__lbl">' +
        lbl +
        "</span></div>"
      );
    }
    function tick() {
      var p = countdownParts(endAtIso);
      if (!p) return;
      if (labeled) {
        wrap.className = "sce-popup-countdown sce-popup-countdown--labeled";
        wrap.innerHTML =
          unitHtml(p.d, "DAYS") +
          '<span class="sce-popup-countdown__sep">:</span>' +
          unitHtml(p.h, "HRS") +
          '<span class="sce-popup-countdown__sep">:</span>' +
          unitHtml(p.m, "MINS") +
          '<span class="sce-popup-countdown__sep">:</span>' +
          unitHtml(p.s, "SECS");
      } else {
        wrap.className = "sce-popup-countdown";
        wrap.innerHTML =
          '<span class="sce-popup-countdown__box">' +
          p.d +
          '</span><span class="sce-popup-countdown__sep">:</span><span class="sce-popup-countdown__box">' +
          p.h +
          '</span><span class="sce-popup-countdown__sep">:</span><span class="sce-popup-countdown__box">' +
          p.m +
          '</span><span class="sce-popup-countdown__sep">:</span><span class="sce-popup-countdown__box">' +
          p.s +
          "</span>";
      }
    }
    tick();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(tick, 1000);
  }

  function buildPopup(cfg) {
    if (!matchesConfigured(cfg)) return null;
    var designId = String(cfg.popupDesignId || "").trim();
    if (isSuppressed(cfg)) return null;

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
    var vst = visualStyle(cfg);
    modal.className =
      "sce-popup-modal sce-popup-modal--layout-" +
      lay.replace(/_/g, "-") +
      " sce-popup-modal--style-" +
      vst;
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

    var cpos = closeButtonPosition(cfg);
    modal.classList.add("sce-popup-modal--close-" + cpos.replace(/_/g, "-"));

    var modalBgUrl = safeImageUrl(cfg.modalBackgroundImageUrl);
    if (modalBgUrl) {
      var bgImg = document.createElement("img");
      bgImg.className = "sce-popup-modal__bg-image";
      bgImg.src = modalBgUrl;
      var altBg = String(cfg.modalBackgroundImageAlt || "").trim();
      bgImg.alt = altBg;
      if (!altBg) bgImg.setAttribute("aria-hidden", "true");
      bgImg.decoding = "async";
      bgImg.loading = "lazy";
      var bgFit = String(cfg.modalBackgroundImageFit || "cover").trim() === "contain" ? "contain" : "cover";
      bgImg.style.objectFit = bgFit;
      modal.appendChild(bgImg);
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
    if (String((cfg || {}).contentAlign || "").trim() === "center") {
      right.classList.add("sce-popup-right--align-center");
    }
    right.style.setProperty("--sce-popup-right-bg", String(cfg.rightPanelBg || "#dbeaf8"));
    right.style.setProperty("--sce-popup-headline", String(cfg.headlineColor || "#0f172a"));
    right.style.setProperty("--sce-popup-sub", String(cfg.subheadlineColor || "#475569"));
    right.style.setProperty("--sce-popup-btn-bg", String(cfg.buttonBg || "#0f172a"));
    right.style.setProperty("--sce-popup-btn-fg", String(cfg.buttonText || "#ffffff"));
    right.style.setProperty("--sce-popup-accent", String(cfg.accentGold || "#c9a227"));
    right.style.background = String(cfg.rightPanelBg || "#dbeaf8");

    function redirectWithCapture(hrefBase, emailVal, nameVal) {
      var url = hrefBase;
      if (emailVal) {
        var sep = hrefBase.indexOf("?") >= 0 ? "&" : "?";
        url = hrefBase + sep + "email=" + encodeURIComponent(emailVal);
        if (nameVal) url += "&first_name=" + encodeURIComponent(nameVal);
      }
      window.location.assign(url);
    }

    function mapPopupSignupError(data) {
      if (!data || typeof data !== "object") return "Something went wrong. Please try again.";
        if (data.error === "protected_customer_data") {
          return "We can't complete your signup right now. Please try again later or contact the store.";
        }
      if (data.error === "session_missing" && data.message) return String(data.message);
      if (data.error === "shopify_user_errors" && data.userErrors && data.userErrors[0] && data.userErrors[0].message) {
        return String(data.userErrors[0].message);
      }
      if (data.error === "graphql" && data.messages && data.messages[0]) return String(data.messages[0]);
      if (data.message === "email_required") return "Please enter your email address.";
      if (data.message === "invalid_email") return "Please enter a valid email address.";
      return "Something went wrong. Please try again.";
    }

    var mainCol = document.createElement("div");
    mainCol.className = "sce-popup-main-col";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "sce-popup-close sce-popup-close--" + cpos.replace(/_/g, "-");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function () {
      if (overlay.dataset.sceBusySubmit === "1") return;
      markDismissed(cfg);
      removePopup();
    });

    var titleBadge = null;
    if (cfg.showTitle !== false) {
      titleBadge = document.createElement("div");
      titleBadge.className = "sce-popup-title";
      var badgeText = String(cfg.titleBadgeText || "\u2726 LIMITED OFFER").trim();
      titleBadge.textContent = badgeText || "\u2726 LIMITED OFFER";
    }

    var h1 = document.createElement("div");
    h1.className = "sce-popup-headline";
    var headStr = String(cfg.headline || "");
    h1.textContent = headStr;
    if (headStr.indexOf("\n") >= 0) {
      h1.classList.add("sce-popup-headline--multiline");
    }

    var sub = document.createElement("div");
    sub.className = "sce-popup-sub";
    sub.textContent = String(cfg.subheadline || "");

    var bodyEl = null;
    var bodyStr = String(cfg.bodyText || "").trim();
    if (bodyStr) {
      bodyEl = document.createElement("div");
      bodyEl.className = "sce-popup-body";
      bodyEl.textContent = bodyStr;
    }

    var cd = null;
    if (cfg.showTiming !== false) {
      cd = document.createElement("div");
      cd.className = "sce-popup-countdown";
      renderCountdownRow(cd, String(cfg.countdownEndAt || "").trim(), cfg);
    }

    var emailRow = null;
    if (cfg.emailCaptureEnabled === true && cfg.showContent !== false) {
      emailRow = document.createElement("div");
      emailRow.className = "sce-popup-email-row";
      var inEmail = document.createElement("input");
      inEmail.type = "email";
      inEmail.className = "sce-popup-input sce-popup-input--email";
      inEmail.setAttribute("autocomplete", "email");
      inEmail.placeholder = String(cfg.emailPlaceholder || "Enter your email");
      emailRow.appendChild(inEmail);
      var emailErr = document.createElement("div");
      emailErr.className = "sce-popup-email-error";
      emailErr.style.display = "none";
      emailErr.setAttribute("role", "alert");
      emailRow.appendChild(emailErr);
      function clearEmailError() {
        emailErr.textContent = "";
        emailErr.style.display = "none";
        inEmail.classList.remove("sce-popup-input--invalid");
      }
      function showEmailError(msg) {
        emailErr.textContent = msg;
        emailErr.style.display = "block";
        inEmail.classList.add("sce-popup-input--invalid");
        try {
          inEmail.focus();
        } catch (_f) {}
      }
      inEmail.addEventListener("input", clearEmailError);
      inEmail.addEventListener("change", clearEmailError);
      emailRow.__sceClearEmailErr = clearEmailError;
      emailRow.__sceShowEmailErr = showEmailError;
    }

    var couponCodeStr = String(cfg.couponCode || "").trim();
    var couponRow = null;
    if (couponCodeStr && cfg.showContent !== false) {
      couponRow = document.createElement("div");
      couponRow.className = "sce-popup-coupon-row";

      var coupon = document.createElement("div");
      coupon.className = "sce-popup-coupon";
      if (String((cfg || {}).couponVariant || "").trim() === "ticket") {
        coupon.classList.add("sce-popup-coupon--ticket");
      }
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

    var successBox = null;
    if (
      cfg.shopifyCustomerCreateEnabled === true &&
      cfg.emailCaptureEnabled === true &&
      cfg.showContent !== false
    ) {
      successBox = document.createElement("div");
      successBox.className = "sce-popup-success";
      successBox.style.display = "none";
      successBox.setAttribute("role", "status");
      var succImgSrc = safeImageUrl(cfg.customerCreateSuccessImageUrl);
      if (succImgSrc) {
        var sImg = document.createElement("img");
        sImg.className = "sce-popup-success__img";
        sImg.src = succImgSrc;
        sImg.alt = "";
        sImg.decoding = "async";
        sImg.loading = "lazy";
        successBox.appendChild(sImg);
      }
      var sMsg = document.createElement("div");
      sMsg.className = "sce-popup-success__msg";
      sMsg.textContent = String(cfg.customerCreateSuccessMessage || "You are subscribed. Thank you!");
      successBox.appendChild(sMsg);
      var sBtn = document.createElement("button");
      sBtn.type = "button";
      sBtn.className = "sce-popup-success__btn sce-popup-cta";
      sBtn.textContent = String(cfg.ctaHref || "").trim() ? "Continue" : "Close";
      successBox.appendChild(sBtn);
    }

    var cta = document.createElement("button");
    cta.type = "button";
    cta.className = "sce-popup-cta";
    cta.textContent = String(cfg.ctaText || "Continue shopping");
    cta.addEventListener("click", function () {
      var href = String(cfg.ctaHref || "").trim();
      var cap = cfg.emailCaptureEnabled === true;
      var wantSignup = cfg.subscriberSignupEnabled === true;
      var wantCustomer = cfg.shopifyCustomerCreateEnabled === true;
      var needsServer = Boolean(apiUrl && (wantSignup || wantCustomer));
      var stayInPopup = wantCustomer && cfg.customerCreateStayInPopup !== false;

      function parseProxyJsonBody(text) {
        var raw = String(text || "").replace(/^\uFEFF/, "").trim();
        if (!raw) return { data: null, parseOk: false };
        function tryParse(s) {
          try {
            var parsed = JSON.parse(s);
            if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
              return { data: parsed, parseOk: true };
            }
          } catch (_e) {
            /* ignore */
          }
          return null;
        }
        var direct = tryParse(raw);
        if (direct) return direct;
        var start = raw.indexOf("{");
        var end = raw.lastIndexOf("}");
        if (start >= 0 && end > start) {
          var sliced = tryParse(raw.slice(start, end + 1));
          if (sliced) return sliced;
        }
        return { data: null, parseOk: false };
      }

      /**
       * When proxies strip custom headers or mangle JSON, the raw body may still contain our success shape.
       * Intentionally substring-based (not a full parse) so truncated bodies can still signal success.
       */
      function bodyLooksLikePopupSubscribeSuccess(rawText) {
        var s = String(rawText || "").replace(/^\uFEFF/, "");
        if (s.length < 10) return false;
        if (!/["']ok["']\s*:\s*true/.test(s)) return false;
        return (
          /["']subscriberCount["']\s*:/.test(s) ||
          /["']alreadyCustomer["']\s*:/.test(s) ||
          /["']alreadySignedUp["']\s*:/.test(s) ||
          /["']customer["']\s*:/.test(s)
        );
      }

      function postSignupJson(body) {
        return fetch(apiUrl, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }).then(function (r) {
          var headerSubscribeOk =
            r.ok &&
            String(r.headers.get("X-Sce-Popup-Subscribe") || "")
              .trim()
              .toLowerCase() === "ok";
          return r.text().then(function (t) {
            var parsed = parseProxyJsonBody(t);
            var bodyLooksSubscribeOk = r.ok && bodyLooksLikePopupSubscribeSuccess(t);
            return {
              httpOk: r.ok,
              data: parsed.data,
              parseOk: parsed.parseOk,
              headerSubscribeOk: headerSubscribeOk,
              bodyLooksSubscribeOk: bodyLooksSubscribeOk,
            };
          });
        });
      }

      /** App-proxy GET verify (loader) - avoids POST-only failures on some setups. */
      function getVerifyCustomerJson(emailForVerify) {
        var sep = apiUrl.indexOf("?") >= 0 ? "&" : "?";
        var u =
          apiUrl +
          sep +
          "intent=verify_customer&email=" +
          encodeURIComponent(String(emailForVerify || "").trim());
        return fetch(u, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }).then(function (r) {
          return r.text().then(function (t) {
            var parsed = parseProxyJsonBody(t);
            return { httpOk: r.ok, data: parsed.data, parseOk: parsed.parseOk };
          });
        });
      }

      function showSuccessUI(alreadyCust, emailVal, nameVal) {
        try {
          if (overlay && overlay.__sceAutoCloseTimer) {
            clearTimeout(overlay.__sceAutoCloseTimer);
            overlay.__sceAutoCloseTimer = null;
          }
        } catch (_x) {}
        if (successBox && mainCol) {
          mainCol.style.display = "none";
          successBox.style.display = "flex";
          var msgEl = successBox.querySelector(".sce-popup-success__msg");
          if (msgEl) {
            var base = String(cfg.customerCreateSuccessMessage || "You are subscribed. Thank you!");
            if (alreadyCust) {
              msgEl.textContent =
                base +
                " This email was already registered - you are subscribed.";
            } else {
              msgEl.textContent = base;
            }
          }
          var btn = successBox.querySelector(".sce-popup-success__btn");
          if (btn) {
            btn.textContent = href ? "Continue" : "Close";
            btn.onclick = function () {
              try {
                if (overlay && overlay.__sceAutoCloseTimer) {
                  clearTimeout(overlay.__sceAutoCloseTimer);
                  overlay.__sceAutoCloseTimer = null;
                }
              } catch (_y) {}
              if (href) redirectWithCapture(href, emailVal, nameVal);
              else {
                markDismissed(cfg);
                removePopup();
              }
            };
          }
          /** After success, auto-dismiss when there is no CTA URL (optional brief success, then close). */
          var autoCloseMs = 2600;
          try {
            var n = Number(cfg.customerCreateSuccessAutoCloseMs);
            if (n >= 0 && n < 120000) autoCloseMs = n;
          } catch (_ac) {}
          if (!href && overlay) {
            overlay.__sceAutoCloseTimer = setTimeout(function () {
              overlay.__sceAutoCloseTimer = null;
              markDismissed(cfg);
              removePopup();
            }, autoCloseMs);
          }
        } else if (href) {
          redirectWithCapture(href, emailVal, nameVal);
        } else {
          markDismissed(cfg);
          removePopup();
        }
      }

      /** Success after we could not read the subscribe response but confirmed the customer exists (e.g. proxy dropped body). */
      function applySubscribeSuccessAfterCustomerVerified(emailVal, nameVal) {
        applySubscribeSuccess({ ok: true, alreadyCustomer: false }, emailVal, nameVal);
      }

      function applySubscribeSuccess(data, emailVal, nameVal) {
        if (data && typeof data.subscriberCount === "number") {
          try {
            cfg.subscriberCount = data.subscriberCount;
          } catch (_c) {}
        }
        var alreadyCust = data && data.alreadyCustomer === true;
        if (stayInPopup) {
          showSuccessUI(!!alreadyCust, emailVal, nameVal);
        } else if (href) {
          redirectWithCapture(href, emailVal, nameVal);
        } else {
          showSuccessUI(!!alreadyCust, emailVal, nameVal);
        }
      }

      function setCtaLoading(loading) {
        try {
          if (emIn) emIn.disabled = !!loading;
          if (closeBtn) closeBtn.disabled = !!loading;
          if (overlay) overlay.dataset.sceBusySubmit = loading ? "1" : "0";
        } catch (_dis) {}
        if (!cta) return;
        if (loading) {
          if (!cta.dataset.sceOrigLabel) cta.dataset.sceOrigLabel = cta.textContent;
          cta.disabled = true;
          cta.classList.add("sce-popup-cta--loading");
          cta.textContent = "Subscribing...";
        } else {
          cta.disabled = false;
          cta.classList.remove("sce-popup-cta--loading");
          if (cta.dataset.sceOrigLabel) cta.textContent = cta.dataset.sceOrigLabel;
        }
      }

      if (cap) {
        var emIn = emailRow && emailRow.querySelector(".sce-popup-input--email");
        var emailVal = emIn ? String(emIn.value || "").trim() : "";
        var clearErr = emailRow && emailRow.__sceClearEmailErr;
        var showErr = emailRow && emailRow.__sceShowEmailErr;
        if (typeof clearErr === "function") clearErr();
        if (!emailVal) {
          if (typeof showErr === "function") showErr("Please enter your email address.");
          return;
        }
        if (!isValidEmailForCapture(emailVal)) {
          if (typeof showErr === "function") showErr("Please enter a valid email address.");
          return;
        }
        var nameVal = "";

        if (needsServer) {
          if (cta.dataset.sceSubmitting === "1") return;
          cta.dataset.sceSubmitting = "1";
          setCtaLoading(true);

          var payload = { email: emailVal };

          function done() {
            setCtaLoading(false);
            cta.dataset.sceSubmitting = "0";
          }

          /** When the server returned a definitive failure, do not poll customer search. */
          function signupErrorMeansSkipCustomerRecovery(data) {
            if (!data || typeof data !== "object") return false;
            var e = data.error;
            return (
              e === "validation" ||
              e === "invalid_json" ||
              e === "popup_not_found" ||
              e === "popup_design_id_required" ||
              e === "email_capture_disabled" ||
              e === "signup_disabled" ||
              e === "verify_disabled" ||
              e === "session_missing" ||
              e === "method_not_allowed" ||
              e === "missing_shop" ||
              e === "shopify_user_errors" ||
              e === "protected_customer_data"
            );
          }

          function userErrorsIndicateEmailAlreadyTaken(userErrors) {
            if (!Array.isArray(userErrors) || !userErrors.length) return false;
            return userErrors.some(function (err) {
              var m = String((err && err.message) || "").toLowerCase();
              return (
                m.includes("taken") ||
                m.includes("already") ||
                m.includes("exist") ||
                m.includes("duplicate") ||
                m.includes("in use") ||
                m.includes("registered") ||
                m.includes("identical")
              );
            });
          }

          /** Allow another POST when Shopify returns userErrors for duplicate email (next request returns ok:true). */
          function signupErrorStopsSubscribeRetry(data) {
            if (!data || typeof data !== "object") return false;
            if (
              wantCustomer &&
              data.error === "shopify_user_errors" &&
              userErrorsIndicateEmailAlreadyTaken(data.userErrors)
            ) {
              return false;
            }
            return signupErrorMeansSkipCustomerRecovery(data);
          }

          function verifyResponseLooksFound(wv) {
            if (!wv || !wv.data || wv.data.ok !== true) return false;
            if (wv.data.found === true) return true;
            var c = wv.data.customer;
            if (c && (c.id || c.email)) return true;
            return false;
          }

          /** One round: GET verify (loader), then POST verify (action) if still not found. */
          function fetchVerifyOnce() {
            return getVerifyCustomerJson(emailVal)
              .catch(function () {
                return { httpOk: false, data: null, parseOk: false };
              })
              .then(function (wv) {
                if (verifyResponseLooksFound(wv)) return wv;
                return postSignupJson({
                  intent: "verify_customer",
                  email: emailVal,
                })
                  .catch(function () {
                    return { httpOk: false, data: null, parseOk: false };
                  })
                  .then(function (wv2) {
                    return verifyResponseLooksFound(wv2) ? wv2 : wv;
                  });
              });
          }

          /** Shopify search can lag after customerCreate; proxies may drop the POST body while the create still succeeds. */
          function tryVerifyRecovery() {
            if (!wantCustomer) return Promise.resolve(false);
            var waits = [0, 400, 900, 1700, 3000, 5000, 8000, 12000];
            var idx = 0;
            function attempt() {
              if (idx >= waits.length) return Promise.resolve(false);
              var ms = waits[idx];
              idx += 1;
              return new Promise(function (resolve) {
                setTimeout(resolve, ms);
              }).then(function () {
                return fetchVerifyOnce().then(function (wv) {
                  if (verifyResponseLooksFound(wv)) {
                    applySubscribeSuccessAfterCustomerVerified(emailVal, nameVal);
                    return true;
                  }
                  return attempt();
                });
              });
            }
            return attempt();
          }

          function genericSubscribeFailureMessage() {
            if (wantCustomer) {
              return "Something went wrong. Please try again in a moment.";
            }
            return "Something went wrong. Please try again.";
          }

          /**
           * Re-post a few times with backoff: first response is often empty/truncated while Shopify still
           * creates the customer; the next POST hits duplicate-email and returns parseable JSON.
           */
          function postSubscribeWithRetries(body, maxAttempts) {
            function attempt(n) {
              return postSignupJson(body).then(function (w) {
                if (w && w.data && signupErrorStopsSubscribeRetry(w.data)) {
                  return w;
                }
                var duplicateShopifyUserErr =
                  wantCustomer &&
                  w &&
                  w.parseOk &&
                  w.data &&
                  w.data.error === "shopify_user_errors" &&
                  userErrorsIndicateEmailAlreadyTaken(w.data.userErrors);
                var looksOk =
                  duplicateShopifyUserErr ||
                  (w &&
                    w.httpOk &&
                    (w.headerSubscribeOk ||
                      w.bodyLooksSubscribeOk ||
                      (w.parseOk && w.data && w.data.ok === true)));
                if (looksOk) return w;
                if (n >= maxAttempts) return w;
                return new Promise(function (resolve) {
                  setTimeout(resolve, 550);
                }).then(function () {
                  return attempt(n + 1);
                });
              });
            }
            return attempt(1);
          }

          function finishSubscribeSuccess(data) {
            done();
            if (typeof clearErr === "function") clearErr();
            applySubscribeSuccess(data, emailVal, nameVal);
          }

          postSubscribeWithRetries(payload, 4).then(function (w) {
              if (w && w.httpOk && w.parseOk && w.data && w.data.ok === true) {
                finishSubscribeSuccess(w.data);
                return;
              }
              if (
                wantCustomer &&
                w &&
                w.parseOk &&
                w.data &&
                w.data.error === "shopify_user_errors" &&
                userErrorsIndicateEmailAlreadyTaken(w.data.userErrors)
              ) {
                finishSubscribeSuccess({ ok: true, alreadyCustomer: true });
                return;
              }
              if (w && w.httpOk && (w.headerSubscribeOk || w.bodyLooksSubscribeOk)) {
                finishSubscribeSuccess(
                  w.parseOk && w.data && w.data.ok === true ? w.data : { ok: true, alreadyCustomer: false },
                );
                return;
              }
              if (!(w && w.data)) {
                return tryVerifyRecovery().then(function (recovered) {
                  done();
                  if (recovered) return;
                  if (wantSignup && !wantCustomer && w && w.httpOk) {
                    finishSubscribeSuccess({ ok: true });
                    return;
                  }
                  if (
                    wantCustomer &&
                    w &&
                    w.parseOk &&
                    w.data &&
                    w.data.error === "shopify_user_errors" &&
                    userErrorsIndicateEmailAlreadyTaken(w.data.userErrors)
                  ) {
                    finishSubscribeSuccess({ ok: true, alreadyCustomer: true });
                    return;
                  }
                  if (typeof showErr === "function") {
                    showErr(genericSubscribeFailureMessage());
                  }
                });
              }
              if (w.data && signupErrorMeansSkipCustomerRecovery(w.data)) {
                done();
                if (
                  wantCustomer &&
                  w.data.error === "shopify_user_errors" &&
                  userErrorsIndicateEmailAlreadyTaken(w.data.userErrors)
                ) {
                  if (typeof clearErr === "function") clearErr();
                  applySubscribeSuccess({ ok: true, alreadyCustomer: true }, emailVal, nameVal);
                  return;
                }
                if (typeof showErr === "function") showErr(mapPopupSignupError(w.data));
                return;
              }
              if (wantCustomer && w.httpOk && w.data && w.data.ok !== true) {
                return tryVerifyRecovery().then(function (recovered) {
                  done();
                  if (!recovered && typeof showErr === "function") {
                    if (
                      w.data &&
                      w.data.error === "shopify_user_errors" &&
                      userErrorsIndicateEmailAlreadyTaken(w.data.userErrors)
                    ) {
                      if (typeof clearErr === "function") clearErr();
                      applySubscribeSuccess({ ok: true, alreadyCustomer: true }, emailVal, nameVal);
                    } else {
                      showErr(mapPopupSignupError(w.data));
                    }
                  }
                });
              }
              if (!w.parseOk || w.data === null) {
                return tryVerifyRecovery().then(function (recovered) {
                  done();
                  if (recovered) return;
                  if (wantSignup && !wantCustomer && w.httpOk) {
                    finishSubscribeSuccess({ ok: true });
                    return;
                  }
                  if (typeof showErr === "function") {
                    showErr(genericSubscribeFailureMessage());
                  }
                });
              }
              if (wantCustomer && w.data && w.data.ok !== true && !w.httpOk) {
                return tryVerifyRecovery().then(function (recovered) {
                  done();
                  if (!recovered && typeof showErr === "function") {
                    showErr(genericSubscribeFailureMessage());
                  }
                });
              }
              done();
              if (typeof showErr === "function") showErr(mapPopupSignupError(w.data));
            })
            .catch(function () {
              tryVerifyRecovery().then(function (recovered) {
                done();
                if (!recovered && typeof showErr === "function") {
                  showErr(genericSubscribeFailureMessage());
                }
              });
            });
          return;
        }

        if (href) {
          redirectWithCapture(href, emailVal, nameVal);
          return;
        }
        markDismissed(cfg);
        removePopup();
        return;
      }
      if (href) {
        window.location.assign(href);
      } else {
        markDismissed(cfg);
        removePopup();
      }
    });

    var footnote = null;
    if (cfg.showDismissFootnote !== false) {
      var footText = String(cfg.dismissFootnoteText || "").trim();
      if (footText) {
        footnote = document.createElement("div");
        footnote.className = "sce-popup-footnote";
        footnote.textContent = footText;
      }
    }

    if (titleBadge) right.appendChild(titleBadge);
    right.appendChild(mainCol);
    if (cfg.showHeadline !== false) {
      mainCol.appendChild(h1);
    }
    if (cfg.showSubheadline !== false) {
      mainCol.appendChild(sub);
    }
    if (bodyEl) {
      mainCol.appendChild(bodyEl);
    }
    if (cd) {
      mainCol.appendChild(cd);
    }
    if (emailRow) {
      mainCol.appendChild(emailRow);
    }
    if (cfg.showContent !== false && couponRow) {
      mainCol.appendChild(couponRow);
    }
    if (cfg.showContent !== false) {
      mainCol.appendChild(cta);
    }
    if (footnote) {
      mainCol.appendChild(footnote);
    }
    if (successBox) {
      right.appendChild(successBox);
    }

    if (left) {
      modal.appendChild(left);
    }
    modal.appendChild(right);
    modal.appendChild(closeBtn);

    overlay.appendChild(backdrop);
    overlay.appendChild(modal);

    backdrop.addEventListener("click", function () {
      if (overlay.dataset.sceBusySubmit === "1") return;
      markDismissed(cfg);
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
    var id = String((cfg || {}).popupDesignId || "").trim();
    if (id && !inThemeEditor) bumpImpressionCount(id);
  }

  function scheduleShow(cfg) {
    if (pendingShowTimeout) {
      clearTimeout(pendingShowTimeout);
      pendingShowTimeout = null;
    }
    removePopup();
    var delay = Math.max(0, Number(cfg.showDelayMs || 0) || 0);
    if (String(cfg.displayTrigger || "") === "on_load") delay = 0;
    if (inThemeEditor) delay = Math.min(delay, 400);
    pendingShowTimeout = setTimeout(function () {
      pendingShowTimeout = null;
      mount(cfg);
    }, delay);
  }

  function fetchPopupConfig(index, urls) {
    if (!urls.length) return Promise.resolve({ status: 404, data: null, fetchUrl: "" });
    var fetchUrl = urls[index];
    return fetch(fetchUrl, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    }).then(function (r) {
      var ct = String(r.headers.get("content-type") || "").toLowerCase();
      if (ct.indexOf("application/json") === -1) {
        if (index + 1 < urls.length) return fetchPopupConfig(index + 1, urls);
        return { status: r.status, data: null, fetchUrl: fetchUrl };
      }
      return r.json().then(function (data) {
        if (data && data.ok === true) return { status: r.status, data: data, fetchUrl: fetchUrl };
        var retryable =
          r.status >= 500 ||
          !data ||
          data.error === "empty_body" ||
          data.error === "missing_shop" ||
          data.error === "app_proxy_auth_failed";
        if (index + 1 < urls.length && retryable) {
          return fetchPopupConfig(index + 1, urls);
        }
        return { status: r.status, data: data, fetchUrl: fetchUrl };
      });
    });
  }

  function refresh() {
    var urls = popupFetchUrls();
    if (!urls.length) return;
    fetchPopupConfig(0, urls)
      .then(function (wrapped) {
        var fetchUrl = wrapped && wrapped.fetchUrl ? wrapped.fetchUrl : urls[0];
        if (!wrapped || !wrapped.data || wrapped.data.ok !== true || wrapped.data.active === false) {
          removePopup();
          if (!wrapped || !wrapped.data || wrapped.data.ok !== true) {
            lastTickSig = "";
            if (!window.__scePopupProxyWarned) {
              window.__scePopupProxyWarned = true;
              if (wrapped && wrapped.data === null && wrapped.status && wrapped.status !== 200) {
                console.warn(
                  "[SCE Popup] App proxy returned non-JSON (HTTP " +
                    wrapped.status +
                    "). Enable Theme → App embeds → Geekify storefront, deploy the app, and open /apps/sce/health on your store.",
                  fetchUrl,
                );
              } else if (wrapped && wrapped.data && wrapped.data.error) {
                var errHint =
                  wrapped.data.error === "no_active_popup"
                    ? "Turn Display on for a popup with Exact URL matching this page (or All pages), then Save."
                    : wrapped.data.error === "popup_inactive"
                      ? "That popup is saved but Display is off in the app."
                      : wrapped.data.hint || "";
                console.warn("[SCE Popup] " + wrapped.data.error + (errHint ? " — " + errHint : ""), fetchUrl);
              }
            }
          }
          return;
        }
        var data = wrapped.data;
        if (data.matched === false) {
          removePopup();
          if (!window.__scePopupTargetWarned) {
            window.__scePopupTargetWarned = true;
            console.warn("[SCE Popup] Server says this page does not match popup targeting.", {
              pageTarget: data.pageTarget,
              exactPageUrl: data.exactPageUrl || "",
              pathname: normalizeStorefrontPath(window.location.pathname || "/"),
              pageType: readPageType(),
              hint: data.hint || "",
            });
          }
          return;
        }
        var cfg = applyServerTargeting(data.config || {}, data);
        if (typeof data.subscriberCount === "number") {
          cfg.subscriberCount = data.subscriberCount;
        }
        var resolvedId = String(cfg.popupDesignId || data.popupDesignId || "").trim();
        if (!resolvedId && data.id != null) {
          resolvedId = "popup-" + String(data.id);
        }
        if (resolvedId) cfg.popupDesignId = resolvedId;
        if (!matchesConfigured(cfg)) {
          removePopup();
          return;
        }
        var nextVersion = String(data.version || "");
        var pathKey = normalizeStorefrontPath(window.location.pathname || "/");
        var pageOk = matchesPageTarget(cfg) ? "1" : "0";
        if (pageOk !== "1" && !window.__scePopupTargetWarned) {
          window.__scePopupTargetWarned = true;
          console.warn(
            "[SCE Popup] Popup loaded from app but hidden on this page.",
            {
              pageTarget: cfg.pageTarget,
              exactPageUrl: cfg.exactPageUrl || "",
              pathname: pathKey,
              pageType: readPageType(),
              serverPageTarget: data.pageTarget,
              serverExactPageUrl: data.exactPageUrl || "",
            },
          );
        }
        var sup = isSuppressed(cfg) ? "1" : "0";
        var tickSig = nextVersion + "|" + pathKey + "|" + pageOk + sup;
        if (tickSig === lastTickSig && (rootEl || sup === "1")) return;
        lastTickSig = tickSig;
        if (pageOk !== "1" || sup === "1") {
          removePopup();
          return;
        }
        scheduleShow(cfg);
      })
      .catch(function (err) {
        if (!window.__scePopupProxyWarned) {
          window.__scePopupProxyWarned = true;
          console.warn(
            "[SCE Popup] Could not load popup config from app proxy:",
            fetchUrl,
            err && err.message ? err.message : err,
            "- Deploy the app with [app_proxy], enable Theme → App embeds → Geekify storefront, and test https://YOUR-STORE.myshopify.com/apps/sce/health",
          );
        }
      });
  }

  function forceRefresh() {
    lastTickSig = "";
    refresh();
  }

  refresh();
  setTimeout(forceRefresh, 600);
  setTimeout(forceRefresh, 1800);
  setInterval(refresh, refreshIntervalMs);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) forceRefresh();
  });
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) forceRefresh();
  });
})();
