(function () {
  // Deferred external scripts: document.currentScript is null (HTML standard).
  var script = document.currentScript;
  if (!script || !script.dataset || !script.dataset.apiUrl) {
    script = null;
    var candidates = document.querySelectorAll("script[data-sce-announcement][data-api-url]");
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].getAttribute("data-sce-ab-ran") !== "1") {
        script = candidates[i];
        break;
      }
    }
  }
  if (!script || !script.dataset) return;
  script.setAttribute("data-sce-ab-ran", "1");

  var barId = (script.dataset.barId || "").trim();
  var apiUrl = (script.dataset.apiUrl || "").trim();
  var zIndex = parseInt(String(script.dataset.zIndex || "1000"), 10) || 1000;

  if (!apiUrl) return;

  var hookId = (script.dataset.sceAbHook || "").trim();
  var placement = String(script.dataset.placement || "sticky")
    .trim()
    .toLowerCase();
  var inlineAnchor = null;
  if (placement === "inline" && hookId) {
    inlineAnchor = document.getElementById(hookId);
  }

  function showInlineError(message) {
    if (!inlineAnchor || !document.body.contains(inlineAnchor)) return;
    inlineAnchor.innerHTML =
      '<div style="padding:10px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;font-size:12px;border-radius:6px;">' +
      String(message || "Announcement bar failed to load.") +
      "</div>";
    inlineAnchor.style.minHeight = "";
  }

  function defaults() {
    return {
      messages: ["Welcome to our store"],
      backgroundColor: "#0f172a",
      textColor: "#f8fafc",
      borderColor: "transparent",
      borderWidthPx: 0,
      fontSizePx: 14,
      fontWeight: "500",
      fontFamily: "inherit",
      textAlign: "center",
      paddingYpx: 10,
      paddingXpx: 16,
      borderRadiusPx: 0,
      shadow: "none",
      letterSpacingEm: 0,
      lineHeight: 1.35,
      maxContentWidthPx: 0,
      marqueeSpeedSeconds: 22,
      rotateIntervalMs: 4500,
      linkUrl: "",
      linkUnderline: true,
      dismissible: false,
    };
  }

  function mergeConfig(raw) {
    var d = defaults();
    if (!raw || typeof raw !== "object") return d;
    for (var k in d) {
      if (Object.prototype.hasOwnProperty.call(raw, k) && raw[k] !== undefined && raw[k] !== null)
        d[k] = raw[k];
    }
    if (!Array.isArray(d.messages) || !d.messages.length) d.messages = defaults().messages;
    d.messages = d.messages
      .map(function (m) {
        return String(m == null ? "" : m);
      })
      .filter(Boolean);
    if (!d.messages.length) d.messages = defaults().messages;
    d.fontSizePx = Number(d.fontSizePx) || defaults().fontSizePx;
    d.borderWidthPx = Math.max(0, Number(d.borderWidthPx) || 0);
    d.paddingYpx = Math.max(0, Number(d.paddingYpx) || 0);
    d.paddingXpx = Math.max(0, Number(d.paddingXpx) || 0);
    d.borderRadiusPx = Math.max(0, Number(d.borderRadiusPx) || 0);
    d.marqueeSpeedSeconds = Math.max(4, Number(d.marqueeSpeedSeconds) || 22);
    d.rotateIntervalMs = Math.max(1500, Number(d.rotateIntervalMs) || 4500);
    d.lineHeight =
      typeof d.lineHeight === "number" && d.lineHeight > 0 ? d.lineHeight : defaults().lineHeight;
    d.maxContentWidthPx = Math.max(0, Number(d.maxContentWidthPx) || 0);
    d.letterSpacingEm = Number(d.letterSpacingEm) || 0;
    d.fontWeight = String(d.fontWeight || "500");
    d.fontFamily = String(d.fontFamily || "inherit");
    d.textAlign = String(d.textAlign || "center");
    d.shadow = String(d.shadow || "none");
    d.linkUrl = String(d.linkUrl || "").trim();
    d.dismissible = Boolean(d.dismissible);
    d.linkUnderline = d.linkUnderline !== false;
    return d;
  }

  function shadowCss(shadow) {
    if (shadow === "subtle") return "0 1px 2px rgba(0,0,0,0.08)";
    if (shadow === "medium") return "0 4px 14px rgba(0,0,0,0.14)";
    return "none";
  }

  function fontStack(family) {
    if (!family || family === "inherit") return "inherit";
    if (family === "system") return "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    if (family === "serif") return 'Georgia, "Times New Roman", serif';
    if (family === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
    return family;
  }

  function removeExisting() {
    var sp = document.querySelector("[data-sce-announcement-spacer]");
    if (sp) sp.remove();
    document.querySelectorAll("[data-sce-announcement-root]").forEach(function (root) {
      var hook = root.parentElement;
      if (hook && hook.classList.contains("sce-announcement-bar-block-hook")) {
        hook.innerHTML = "";
        hook.style.minHeight = "1px";
      } else {
        root.remove();
      }
    });
    document.body.classList.remove("sce-announcement-bar--sticky-pad");
  }

  function applyBarStyles(el, cfg) {
    el.style.setProperty("--sce-ab-z", String(zIndex));
    el.style.backgroundColor = cfg.backgroundColor;
    el.style.color = cfg.textColor;
    el.style.borderStyle = cfg.borderWidthPx > 0 ? "solid" : "none";
    el.style.borderColor = cfg.borderWidthPx > 0 ? cfg.borderColor : "transparent";
    el.style.borderWidth = cfg.borderWidthPx > 0 ? cfg.borderWidthPx + "px" : "0";
    el.style.fontSize = cfg.fontSizePx + "px";
    el.style.fontWeight = cfg.fontWeight;
    el.style.fontFamily = fontStack(cfg.fontFamily);
    el.style.textAlign = cfg.textAlign;
    el.style.padding = cfg.paddingYpx + "px " + cfg.paddingXpx + "px";
    el.style.borderRadius = cfg.borderRadiusPx + "px";
    el.style.boxShadow = shadowCss(cfg.shadow);
    el.style.letterSpacing = cfg.letterSpacingEm ? cfg.letterSpacingEm + "em" : "normal";
    el.style.lineHeight = String(cfg.lineHeight);
    el.style.setProperty("--sce-ab-font-family", fontStack(cfg.fontFamily));
    el.style.setProperty(
      "--sce-ab-link-decoration",
      cfg.linkUnderline ? "underline" : "none",
    );
  }

  function buildTextHtml(cfg, text) {
    var esc = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    if (cfg.linkUrl) {
      return (
        '<a class="sce-announcement-bar__link" href="' +
        cfg.linkUrl.replace(/"/g, "&quot;") +
        '">' +
        esc +
        "</a>"
      );
    }
    return esc;
  }

  function innerWrap(cfg, bodyHtml) {
    var max =
      cfg.maxContentWidthPx > 0
        ? ' style="max-width:' + cfg.maxContentWidthPx + "px;margin-left:auto;margin-right:auto\""
        : "";
    return (
      '<div class="sce-announcement-bar__inner"' +
      max +
      ">" +
      '<div class="sce-announcement-bar__text-wrap">' +
      bodyHtml +
      "</div>" +
      (cfg.dismissible
        ? '<button type="button" class="sce-announcement-bar__dismiss" aria-label="Dismiss">&times;</button>'
        : "") +
      "</div>"
    );
  }

  function mountStickyBar(cfg, innerHtml) {
    removeExisting();
    var bar = document.createElement("div");
    bar.className = "sce-announcement-bar sce-announcement-bar--sticky";
    bar.setAttribute("data-sce-announcement-root", "1");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Announcement");
    applyBarStyles(bar, cfg);
    bar.innerHTML = innerHtml;
    document.body.insertBefore(bar, document.body.firstChild);

    var h = bar.offsetHeight;
    var spacer = document.createElement("div");
    spacer.className = "sce-announcement-bar__spacer";
    spacer.setAttribute("data-sce-announcement-spacer", "1");
    spacer.style.setProperty("--sce-ab-height", h + "px");
    spacer.style.height = h + "px";
    document.body.insertBefore(spacer, document.body.firstChild);
    document.body.classList.add("sce-announcement-bar--sticky-pad");
    return bar;
  }

  /** Renders inside the theme app block hook so the editor shows real content. */
  function mountInlineBar(anchor, cfg, innerHtml) {
    removeExisting();
    anchor.innerHTML = "";
    anchor.style.minHeight = "";
    var bar = document.createElement("div");
    bar.className = "sce-announcement-bar sce-announcement-bar--inline";
    bar.setAttribute("data-sce-announcement-root", "1");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Announcement");
    applyBarStyles(bar, cfg);
    bar.innerHTML = innerHtml;
    anchor.appendChild(bar);
    return bar;
  }

  function bindDismiss(barRoot, cfg, dismissKey) {
    if (!cfg.dismissible) return;
    var btn = barRoot.querySelector(".sce-announcement-bar__dismiss");
    if (!btn) return;
    btn.addEventListener("click", function () {
      try {
        sessionStorage.setItem(dismissKey, "1");
      } catch (e) {}
      var sp = document.querySelector("[data-sce-announcement-spacer]");
      if (sp) sp.remove();
      barRoot.remove();
      document.body.classList.remove("sce-announcement-bar--sticky-pad");
    });
  }

  function injectCustomCss(resolvedBarId, css) {
    var trimmed = String(css || "").trim();
    var safeId = String(resolvedBarId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
    var sid = "sce-ab-custom-css-" + safeId;
    var existing = document.getElementById(sid);
    if (existing) existing.remove();
    if (!trimmed) return;
    var st = document.createElement("style");
    st.id = sid;
    st.textContent = trimmed;
    document.head.appendChild(st);
  }

  function showCustomMarkup(cfg, innerMarkup, dismissKey, inlineAnchor) {
    var mount =
      inlineAnchor && document.body.contains(inlineAnchor)
        ? function (c, html) {
            return mountInlineBar(inlineAnchor, c, html);
          }
        : mountStickyBar;
    var html = innerWrap(cfg, innerMarkup);
    var root = mount(cfg, html);
    bindDismiss(root, cfg, dismissKey);
  }

  function show(barType, cfg, dismissKey, inlineAnchor) {
    try {
      if (cfg.dismissible && sessionStorage.getItem(dismissKey) === "1") return;
    } catch (e) {}

    var mount =
      inlineAnchor && document.body.contains(inlineAnchor)
        ? function (c, html) {
            return mountInlineBar(inlineAnchor, c, html);
          }
        : mountStickyBar;

    if (barType === "marquee") {
      var sep = ' <span aria-hidden="true">&nbsp;•&nbsp;</span> ';
      var text = cfg.messages.join(sep);
      var doubled = buildTextHtml(cfg, text) + sep + buildTextHtml(cfg, text);
      var html = innerWrap(
        cfg,
        '<div class="sce-announcement-bar__marquee"><div class="sce-announcement-bar__track" style="--sce-ab-marquee-duration:' +
          cfg.marqueeSpeedSeconds +
          's">' +
          doubled +
          "</div></div>",
      );
      var root = mount(cfg, html);
      bindDismiss(root, cfg, dismissKey);
      return;
    }

    if (barType === "rotating") {
      var htmlR = innerWrap(
        cfg,
        '<div class="sce-announcement-bar__rotate">' +
          buildTextHtml(cfg, cfg.messages[0] || "") +
          "</div>",
      );
      var rootR = mount(cfg, htmlR);
      var rot = rootR.querySelector(".sce-announcement-bar__rotate");
      if (rot && cfg.messages.length > 1) {
        var idx = 0;
        setInterval(function () {
          idx = (idx + 1) % cfg.messages.length;
          rot.innerHTML = buildTextHtml(cfg, cfg.messages[idx] || "");
        }, cfg.rotateIntervalMs);
      }
      bindDismiss(rootR, cfg, dismissKey);
      return;
    }

    var msg = cfg.messages[0] || "";
    var rootS = mount(cfg, innerWrap(cfg, buildTextHtml(cfg, msg)));
    bindDismiss(rootS, cfg, dismissKey);
  }

  var url = apiUrl;
  if (barId) {
    var joinChar = apiUrl.indexOf("?") >= 0 ? "&" : "?";
    url = apiUrl + joinChar + "id=" + encodeURIComponent(barId);
  }

  fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(function (r) {
      var ct = (r.headers.get("content-type") || "").toLowerCase();
      if (ct.indexOf("application/json") === -1) {
        console.warn(
          "[SCE announcement bar] Expected JSON but got",
          r.status,
          ct || "(no content-type). Is the app proxy URL correct in Shopify (Partners / app dev) and the app running?",
        );
        showInlineError(
          "Proxy error: expected JSON. Run `npm run dev -- --reset` and ensure app proxy is configured.",
        );
        return null;
      }
      return r.json().then(function (data) {
        return { status: r.status, data: data };
      });
    })
    .then(function (wrapped) {
      if (!wrapped || !wrapped.data) return;
      var data = wrapped.data;
      if (!data.ok) {
        console.warn(
          "[SCE announcement bar]",
          data.error || "error",
          wrapped.status,
          data.hint || "",
          "Request URL:",
          url,
        );
        showInlineError(
          "Announcement not found. Check Bar ID and make sure the bar is Active in app admin.",
        );
        return;
      }
      var resolvedId = String(data.id || barId || "");
      var dismissKey = "sce_ab_dismiss_" + (resolvedId || "unknown");
      var cfg = mergeConfig(data.config || {});
      var barType = String(data.barType || "sticky");
      var customHtml = String(data.customHtml || "").trim();
      var customCss = String(data.customCss || "").trim();
      injectCustomCss(resolvedId, customCss);
      if (customHtml) {
        showCustomMarkup(cfg, customHtml, dismissKey, inlineAnchor);
        return;
      }
      show(barType, cfg, dismissKey, inlineAnchor);
    })
    .catch(function (err) {
      console.warn("[SCE announcement bar] Request failed", err && err.message ? err.message : err);
      showInlineError("Request failed. Check app dev server is running and refresh preview.");
    });
})();
