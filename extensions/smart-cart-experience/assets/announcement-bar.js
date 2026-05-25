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

  function normalizeThemeSectionId(raw) {
    var s = String(raw == null ? "" : raw).trim();
    try {
      if (s.indexOf("%") !== -1) s = decodeURIComponent(s);
    } catch (e) {}
    return s.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  }

  function sectionIdsMatch(a, b) {
    var x = String(a == null ? "" : a).trim();
    var y = String(b == null ? "" : b).trim();
    if (!x || !y) return false;
    if (x.toLowerCase() === y.toLowerCase()) return true;
    return false;
  }

  /** Display toggle must be on (active:true) and pinned Section ID must match the payload. */
  function shouldRenderAnnouncement(data) {
    if (!data || data.ok !== true || data.active !== true) return false;
    if (!sectionId) return true;
    var resolvedSectionId = String(data.sectionHtmlId || "").trim();
    var rowId = String(data.id || "").trim();
    return (
      sectionIdsMatch(resolvedSectionId, sectionId) ||
      sectionIdsMatch(rowId, sectionId)
    );
  }

  function hideAnnouncement() {
    removeExisting();
    lastRenderVersion = "";
  }

  var sectionId = normalizeThemeSectionId(script.dataset.sectionId);
  var apiUrl = (script.dataset.apiUrl || "").trim();
  var zIndex = parseInt(String(script.dataset.zIndex || "1000"), 10) || 1000;

  if (!apiUrl) return;
  var refreshIntervalMs = 30000;
  var lastRenderVersion = "";
  var managedIntervals = [];

  var hookId = (script.dataset.sceAbHook || "").trim();
  var hookHost = hookId ? document.getElementById(hookId) : null;
  var placement = String(script.dataset.placement || "inline")
    .trim()
    .toLowerCase();
  var inlineAnchor = null;
  if (placement === "inline" && hookHost) {
    inlineAnchor = hookHost;
  }

  function showInlineError(message) {
    var anchor = hookHost || inlineAnchor;
    if (!anchor || !document.body.contains(anchor)) {
      console.warn("[SCE announcement bar]", String(message || ""));
      return;
    }
    anchor.innerHTML =
      '<div style="padding:10px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;font-size:12px;border-radius:6px;">' +
      String(message || "Announcement bar failed to load.") +
      "</div>";
    anchor.style.minHeight = "";
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
      marqueeSeparatorIcon: "•",
      marqueeSeparatorGapPx: 16,
      marqueePauseOnHover: false,
      rotateIntervalMs: 4500,
      linkUrl: "",
      linkUnderline: true,
      dismissible: false,
      ctaLabel: "",
      ctaBackgroundColor: "#EF5350",
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
    d.marqueeSeparatorIcon = String(d.marqueeSeparatorIcon || "•").trim() || "•";
    d.marqueeSeparatorGapPx = Math.max(0, Number(d.marqueeSeparatorGapPx) || 16);
    d.marqueePauseOnHover = d.marqueePauseOnHover === true;
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
    d.ctaLabel = String(d.ctaLabel || "").trim();
    d.ctaBackgroundColor = String(d.ctaBackgroundColor || "#EF5350").trim();
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
    for (var i = 0; i < managedIntervals.length; i++) {
      clearInterval(managedIntervals[i]);
    }
    managedIntervals = [];
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

  function setManagedInterval(fn, ms) {
    var id = setInterval(fn, ms);
    managedIntervals.push(id);
    return id;
  }

  function applyBarStyles(el, cfg) {
    var messageCount = Array.isArray(cfg.messages) ? cfg.messages.length : 1;
    var dynamicGapPx = messageCount > 4 ? 10 : messageCount > 2 ? 12 : 14;
    el.style.setProperty("--sce-ab-z", String(zIndex));
    el.style.setProperty("--sce-ab-message-gap", dynamicGapPx + "px");
    el.style.setProperty("--sce-ab-message-max-inline", "100%");
    var bg = String(cfg.backgroundColor || "").trim();
    if (/gradient\s*\(/i.test(bg) || /^url\s*\(/i.test(bg)) {
      el.style.background = bg;
      el.style.backgroundColor = "transparent";
    } else {
      el.style.background = "";
      el.style.backgroundColor = bg;
    }
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
    el.style.setProperty("--sce-ab-separator-gap", String(cfg.marqueeSeparatorGapPx) + "px");
    el.style.setProperty(
      "--sce-ab-marquee-hover-play-state",
      cfg.marqueePauseOnHover ? "paused" : "running",
    );
    el.style.setProperty(
      "--sce-ab-link-decoration",
      cfg.linkUnderline ? "underline" : "none",
    );
  }

  function escHtmlStr(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hrefAttr(url) {
    return String(url || "").replace(/"/g, "&quot;");
  }

  function buildTextHtml(cfg, text) {
    var esc = escHtmlStr(text);
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

  function buildStickyStackHtml(cfg) {
    var msgCfg = cfg;
    if (String(cfg.ctaLabel || "").trim() && cfg.linkUrl) {
      msgCfg = { ...cfg, linkUrl: "" };
    }
    var stack = buildMessagesStackHtml(msgCfg);
    var cta = String(cfg.ctaLabel || "").trim();
    if (!cta || !cfg.linkUrl) return stack;
    var ctaBg = String(cfg.ctaBackgroundColor || "#EF5350").trim() || "#EF5350";
    return (
      '<div class="sce-announcement-bar__sticky-with-cta">' +
      '<div class="sce-announcement-bar__sticky-with-cta__main">' +
      stack +
      "</div>" +
      '<a class="sce-announcement-bar__cta" href="' +
      hrefAttr(cfg.linkUrl) +
      '" style="background-color:' +
      hrefAttr(ctaBg) +
      '">' +
      escHtmlStr(cta) +
      "</a></div>"
    );
  }

  function messagesStackAlignClass(cfg) {
    var align = String(cfg.textAlign || "center").toLowerCase();
    if (align === "left" || align === "start") return "sce-announcement-bar__messages-stack--start";
    if (align === "right" || align === "end") return "sce-announcement-bar__messages-stack--end";
    return "sce-announcement-bar__messages-stack--center";
  }

  function buildMessagesStackHtml(cfg) {
    var mod = messagesStackAlignClass(cfg);
    var parts = [];
    for (var i = 0; i < cfg.messages.length; i++) {
      parts.push(
        '<div class="sce-announcement-bar__message-line">' +
          buildTextHtml(cfg, cfg.messages[i] || "") +
          "</div>",
      );
    }
    return (
      '<div class="sce-announcement-bar__messages-stack ' + mod + '">' + parts.join("") + "</div>"
    );
  }

  function innerWrap(cfg, bodyHtml, textWrapExtraClass) {
    var wrapClass = "sce-announcement-bar__text-wrap";
    if (textWrapExtraClass) wrapClass += " " + String(textWrapExtraClass).trim();
    var max =
      cfg.maxContentWidthPx > 0
        ? ' style="max-width:' + cfg.maxContentWidthPx + "px;margin-left:auto;margin-right:auto\""
        : "";
    return (
      '<div class="sce-announcement-bar__inner"' +
      max +
      ">" +
      '<div class="' +
      wrapClass +
      '">' +
      bodyHtml +
      "</div>" +
      (cfg.dismissible
        ? '<button type="button" class="sce-announcement-bar__dismiss" aria-label="Dismiss">&times;</button>'
        : "") +
      "</div>"
    );
  }

  function applyDomSectionId(el, sectionHtmlId) {
    var sid = String(sectionHtmlId || "").trim();
    if (sid && /^[A-Za-z][A-Za-z0-9_-]*$/.test(sid)) {
      el.id = sid;
    } else {
      el.removeAttribute("id");
    }
  }

  function buildRotateBodyHtml(cfg, idx) {
    return (
      '<div class="sce-announcement-bar__messages-stack ' +
      messagesStackAlignClass(cfg) +
      '">' +
      '<div class="sce-announcement-bar__message-line">' +
      buildTextHtml(cfg, cfg.messages[idx] || "") +
      "</div></div>"
    );
  }

  function buildMarqueeSegmentHtml(cfg) {
    var icon = escHtmlStr(String(cfg.marqueeSeparatorIcon || "•").trim() || "•");
    var out = [];
    for (var i = 0; i < cfg.messages.length; i++) {
      out.push(
        '<span class="sce-announcement-bar__marquee-item">' +
          buildTextHtml(cfg, cfg.messages[i] || "") +
          "</span>",
      );
      out.push('<span class="sce-announcement-bar__marquee-separator" aria-hidden="true">' + icon + "</span>");
    }
    return out.join("");
  }

  function fillMarqueeTrack(root, cfg) {
    if (!root) return;
    var marquee = root.querySelector(".sce-announcement-bar__marquee");
    var track = root.querySelector(".sce-announcement-bar__track");
    var baseSegment = root.querySelector(".sce-announcement-bar__segment");
    if (!marquee || !track || !baseSegment) return;

    var marqueeWidth = Math.ceil(marquee.getBoundingClientRect().width || 0);
    var segmentWidth = Math.ceil(baseSegment.getBoundingClientRect().width || 0);
    if (!marqueeWidth || !segmentWidth) return;

    /* Ensure enough copies exist so the viewport is always filled while one segment loops. */
    var currentWidth = segmentWidth * track.querySelectorAll(".sce-announcement-bar__segment").length;
    var minTrackWidth = marqueeWidth * 2 + segmentWidth;
    var guard = 0;
    while (currentWidth < minTrackWidth && guard < 24) {
      var clone = baseSegment.cloneNode(true);
      clone.classList.add("sce-announcement-bar__segment--clone");
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
      currentWidth += segmentWidth;
      guard += 1;
    }

    track.style.setProperty("--sce-ab-loop-width", segmentWidth + "px");
    track.style.setProperty("--sce-ab-marquee-duration", cfg.marqueeSpeedSeconds + "s");
  }

  function mountStickyBar(cfg, innerHtml, sectionHtmlId) {
    removeExisting();
    var bar = document.createElement("div");
    bar.className = "sce-announcement-bar sce-announcement-bar--sticky";
    bar.setAttribute("data-sce-announcement-root", "1");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Announcement");
    applyDomSectionId(bar, sectionHtmlId);
    applyBarStyles(bar, cfg);
    bar.innerHTML = innerHtml;
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  /** Renders inside the theme app block hook so the editor shows real content. */
  function mountInlineBar(anchor, cfg, innerHtml, sectionHtmlId) {
    removeExisting();
    anchor.innerHTML = "";
    anchor.style.minHeight = "";
    var bar = document.createElement("div");
    bar.className = "sce-announcement-bar sce-announcement-bar--inline";
    bar.setAttribute("data-sce-announcement-root", "1");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Announcement");
    applyDomSectionId(bar, sectionHtmlId);
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

  function showCustomMarkup(cfg, innerMarkup, dismissKey, inlineAnchor, sectionHtmlId) {
    var mount =
      inlineAnchor && document.body.contains(inlineAnchor)
        ? function (c, html) {
            return mountInlineBar(inlineAnchor, c, html, sectionHtmlId);
          }
        : function (c, html) {
            return mountStickyBar(c, html, sectionHtmlId);
          };
    var html = innerWrap(cfg, innerMarkup);
    var root = mount(cfg, html);
    bindDismiss(root, cfg, dismissKey);
  }

  function show(barType, cfg, dismissKey, inlineAnchor, sectionHtmlId) {
    try {
      if (cfg.dismissible && sessionStorage.getItem(dismissKey) === "1") return;
    } catch (e) {}

    var mount =
      inlineAnchor && document.body.contains(inlineAnchor)
        ? function (c, html) {
            return mountInlineBar(inlineAnchor, c, html, sectionHtmlId);
          }
        : function (c, html) {
            return mountStickyBar(c, html, sectionHtmlId);
          };

    if (barType === "marquee") {
      var segment = '<span class="sce-announcement-bar__segment">' + buildMarqueeSegmentHtml(cfg) + "</span>";
      var html = innerWrap(
        cfg,
        '<div class="sce-announcement-bar__marquee"><div class="sce-announcement-bar__track" style="--sce-ab-marquee-duration:' +
          cfg.marqueeSpeedSeconds +
          's">' +
          segment +
          segment +
          "</div></div>",
        "sce-announcement-bar__text-wrap--marquee",
      );
      var root = mount(cfg, html);
      fillMarqueeTrack(root, cfg);
      bindDismiss(root, cfg, dismissKey);
      return;
    }

    if (barType === "rotating") {
      var hasNav = cfg.messages.length > 1;
      var htmlR = innerWrap(
        cfg,
        '<div class="sce-announcement-bar__rotate">' +
          (hasNav
            ? '<button type="button" class="sce-announcement-bar__nav" data-sce-ab-nav="prev" aria-label="Previous announcement">&#8249;</button>'
            : "") +
          '<div class="sce-announcement-bar__rotate-body">' +
          buildRotateBodyHtml(cfg, 0) +
          "</div>" +
          (hasNav
            ? '<button type="button" class="sce-announcement-bar__nav" data-sce-ab-nav="next" aria-label="Next announcement">&#8250;</button>'
            : "") +
          "</div>",
      );
      var rootR = mount(cfg, htmlR);
      var rot = rootR.querySelector(".sce-announcement-bar__rotate");
      var rotBody = rootR.querySelector(".sce-announcement-bar__rotate-body");
      if (rot && rotBody && cfg.messages.length > 1) {
        var idx = 0;
        function renderCurrent() {
          rotBody.innerHTML = buildRotateBodyHtml(cfg, idx);
        }
        var prevBtn = rot.querySelector('[data-sce-ab-nav="prev"]');
        var nextBtn = rot.querySelector('[data-sce-ab-nav="next"]');
        if (prevBtn) {
          prevBtn.addEventListener("click", function () {
            idx = (idx - 1 + cfg.messages.length) % cfg.messages.length;
            renderCurrent();
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener("click", function () {
            idx = (idx + 1) % cfg.messages.length;
            renderCurrent();
          });
        }
        setManagedInterval(function () {
          idx = (idx + 1) % cfg.messages.length;
          renderCurrent();
        }, cfg.rotateIntervalMs);
      }
      bindDismiss(rootR, cfg, dismissKey);
      return;
    }

    var rootS = mount(cfg, innerWrap(cfg, buildStickyStackHtml(cfg)));
    bindDismiss(rootS, cfg, dismissKey);
  }

  function buildFetchUrl(base) {
    var u = String(base || "").trim();
    if (!sectionId) return u;
    var joinChar = u.indexOf("?") >= 0 ? "&" : "?";
    return u + joinChar + "sectionId=" + encodeURIComponent(sectionId);
  }

  /**
   * Shopify maps storefront /apps/{subpath}/rest to app proxy url + /rest.
   * Legacy proxy url at app root forwards /apps/sce/foo → /foo on the app server.
   */
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

  var primaryApiBase = apiUrl;
  var candidateBases = uniqueStrings([
    primaryApiBase,
    alternateShortPath(primaryApiBase),
    "/apps/sce/announcement-bar",
    "/announcement-bar",
  ]);

  function fetchAnnouncementData() {
    function parseResponseBody(r, text) {
      var raw = String(text || "").trim();
      if (!raw) {
        var st = r.status;
        var emptyHint =
          st === 400 || st === 401
            ? "App proxy verification failed (empty response). Use your storefront URL (…myshopify.com), not the app tunnel. Run shopify app dev; in Partners → App proxy, match URL, prefix apps, subpath sce, and API secret to this app."
            : "App proxy returned an empty body (HTTP " +
              st +
              "). Check tunnel, App proxy settings, and that the theme loads on the real shop domain.";
        return {
          status: st,
          data: {
            ok: false,
            error: "empty_body",
            hint: emptyHint,
          },
        };
      }
      var ct = (r.headers.get("content-type") || "").toLowerCase();
      var looksLikeJson =
        ct.indexOf("application/json") !== -1 ||
        ct.indexOf("text/json") !== -1 ||
        /^\s*[\[{]/.test(raw);
      if (!looksLikeJson && raw) {
        console.warn(
          "[SCE announcement bar] Non-JSON response",
          r.status,
          ct || "(no content-type)",
          raw.slice(0, 160),
        );
        showInlineError(
          "App proxy returned HTML instead of JSON (HTTP " +
            r.status +
            "). In Partners → App setup → App proxy, confirm proxy URL, path prefix apps, and subpath sce match your app.",
        );
        return null;
      }
      var data = null;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        console.warn("[SCE announcement bar] JSON parse failed", r.status, raw.slice(0, 200));
        showInlineError(
          "Invalid JSON from app proxy (HTTP " +
            r.status +
            "). Check that GET /apps/sce/announcement-bar routes to your app and returns JSON.",
        );
        return null;
      }
      return { status: r.status, data: data };
    }

    function tryCandidate(index) {
      if (index >= candidateBases.length) {
        return Promise.resolve({
          status: 404,
          data: {
            ok: false,
            error: "empty_body",
            hint:
              "No response from any proxy path tried. Run shopify app dev (or deploy), ensure shopify.app.toml includes [app_proxy] url=/apps/sce, accept the write_app_proxy scope, or set \"App proxy API path\" in this block if your proxy URL was customized in Shopify admin.",
          },
        });
      }
      var fetchUrl = buildFetchUrl(candidateBases[index]);
      return fetch(fetchUrl, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).then(function (r) {
        return r.text().then(function (text) {
          var raw = String(text || "").trim();
          if (!raw && r.status === 404 && index + 1 < candidateBases.length) {
            return tryCandidate(index + 1);
          }
          return parseResponseBody(r, text);
        });
      });
    }

    return tryCandidate(0);
  }

  function dataVersion(data) {
    if (!data || typeof data !== "object") return "";
    if (data.version) return String(data.version);
    return JSON.stringify({
      id: data.id || "",
      sectionHtmlId: data.sectionHtmlId || "",
      barType: data.barType || "",
      config: data.config || {},
      customHtml: data.customHtml || "",
      customCss: data.customCss || "",
    });
  }

  function renderFromData(data) {
    var resolvedId = String(data.id || "");
    var dismissKey = "sce_ab_dismiss_" + (resolvedId || "unknown");
    var cfg = mergeConfig(data.config || {});
    var barType = String(data.barType || "sticky");
    var customHtml = String(data.customHtml || "").trim();
    var customCss = String(data.customCss || "").trim();
    var sectionHtmlId = String(data.sectionHtmlId || "").trim();
    injectCustomCss(resolvedId, customCss);
    if (customHtml) {
      showCustomMarkup(cfg, customHtml, dismissKey, inlineAnchor, sectionHtmlId);
      return;
    }
    show(barType, cfg, dismissKey, inlineAnchor, sectionHtmlId);
  }

  function ensureHookHost() {
    if (hookId && !hookHost) {
      hookHost = document.getElementById(hookId);
      if (placement === "inline" && hookHost) inlineAnchor = hookHost;
    }
  }

  function refreshAnnouncement() {
    ensureHookHost();
    fetchAnnouncementData()
      .then(function (wrapped) {
        if (!wrapped || !wrapped.data) {
          hideAnnouncement();
          return;
        }
        var data = wrapped.data;
        if (!shouldRenderAnnouncement(data)) {
          hideAnnouncement();
          var errCode = String(data.error || "");
          if (
            errCode === "no_active_header" ||
            errCode === "header_inactive" ||
            data.active === false ||
            errCode === "not_found"
          ) {
            return;
          }
          console.warn(
            "[SCE announcement bar]",
            data.error || "error",
            wrapped.status,
            data.hint || "",
            "Request URL:",
            candidateBases.join(", "),
          );
          var hint = String(data.hint || "").trim();
          var msg =
            errCode === "missing_shop"
              ? "Shop could not be determined from the app proxy request. Confirm App proxy settings."
              : errCode === "app_proxy_auth_failed"
                ? hint ||
                  "App proxy request was not verified. Open the storefront on your shop domain and confirm App proxy configuration."
                : hint ||
                  "Announcement not found. Turn Display on in the app, or paste the Section ID from Announcement bars.";
          showInlineError(msg);
          return;
        }
        var nextVersion = dataVersion(data);
        if (nextVersion && nextVersion === lastRenderVersion) return;
        hideAnnouncement();
        renderFromData(data);
        lastRenderVersion = nextVersion;
      })
      .catch(function (err) {
        hideAnnouncement();
        console.warn("[SCE announcement bar] Request failed", err && err.message ? err.message : err, candidateBases.join(", "));
        if (!lastRenderVersion) {
          showInlineError(
            "Could not reach /apps/sce/announcement-bar (connection blocked or refused). " +
              "If you use Shopify CLI, run shopify app dev so the app proxy tunnel is active. " +
              "In production, confirm App proxy is configured and this theme preview uses your storefront domain.",
          );
        }
      });
  }

  refreshAnnouncement();
  setInterval(refreshAnnouncement, refreshIntervalMs);
})();
