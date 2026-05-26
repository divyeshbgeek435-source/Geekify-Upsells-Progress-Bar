(function () {
  /** Deferred scripts: `document.currentScript` is null - never use the last tag in the DOM (mixes embed vs section configs). */
  var script = document.currentScript;
  if (!script || !script.dataset) {
    script = null;
    var candidates = document.querySelectorAll('script[src*="free-shipping-progress.js"]');
    for (var si = 0; si < candidates.length; si++) {
      if (candidates[si].getAttribute("data-sce-fs-ran") !== "1") {
        script = candidates[si];
        break;
      }
    }
  }
  if (!script || !script.dataset) return;
  script.setAttribute("data-sce-fs-ran", "1");
  var rawInstanceKey =
    (script.dataset.instanceId ||
      script.dataset.blockId ||
      script.dataset.sectionId ||
      script.getAttribute("data-section-id") ||
      script.id ||
      script.src ||
      "sce-default-instance");
  var instanceKey = String(rawInstanceKey).trim() || "sce-default-instance";
  var globalInstances = (window.__sceShippingProgressInstances =
    window.__sceShippingProgressInstances || {});
  if (
    globalInstances[instanceKey] &&
    typeof globalInstances[instanceKey].teardown === "function"
  ) {
    try {
      globalInstances[instanceKey].teardown();
    } catch (_) {
      /* ignore previous teardown failure */
    }
  }

  var thresholdValue = Number(script.dataset.threshold || 0);
  var shippingChargeValue = Number(script.dataset.shippingCharge || 0);
  var titleText = script.dataset.title || "Free shipping progress";
  var progressText = script.dataset.progressText || "Spend [remaining_amount] more for free shipping.";
  var reachedText = script.dataset.reachedText || "You have free shipping!";
  var chargedText = script.dataset.chargedText || "Shipping charge [shipping_amount] applied";
  var sequentialMode = String(script.dataset.sequentialMode || "").toLowerCase() === "true";
  var dynamicTierMode = String(script.dataset.dynamicTierMode || "").toLowerCase() === "true";
  var unlockAttributeKey =
    (script.dataset.unlockAttributeKey || "sce_sequential_unlock").trim() || "sce_sequential_unlock";
  var sequentialTitle = script.dataset.sequentialTitle || titleText;
  var tier1Label = script.dataset.tier1Label || "Discount";
  var tier2Label = script.dataset.tier2Label || "Free shipping";
  var unlockTier1Text = script.dataset.unlockTier1Text || "Unlock Tier 1";
  var unlockTier2Text = script.dataset.unlockTier2Text || "Unlock free shipping";
  var tier1DoneText = script.dataset.tier1DoneText || "Tier 1 unlocked";
  var tier2DoneText = script.dataset.tier2DoneText || "Tier 2 unlocked";
  var tier1TagText = script.dataset.tier1TagText || "10% OFF";
  var tier2TagText = script.dataset.tier2TagText || "Free shipping";
  var lockedText = script.dataset.lockedText || "Locked";
  var appliedText = script.dataset.appliedText || "Applied";
  var sequentialHintZero =
    script.dataset.sequentialHintZero || "Progress: 0% - unlock Tier 1 to start.";
  var sequentialHintMid =
    script.dataset.sequentialHintMid || "Progress: 50% - unlock Tier 2 for free shipping.";
  var tier1Icon = script.dataset.tier1Icon || "%";
  var tier2Icon = script.dataset.tier2Icon || "🚚";
  var subtotalLabel = script.dataset.subtotalLabel || "Current subtotal";
  var estimatedShippingLabel = script.dataset.estimatedShippingLabel || "Estimated shipping";
  var widgetBackgroundColor = script.dataset.widgetBackgroundColor || "#ffffff";
  var widgetTextColor = script.dataset.widgetTextColor || "#111827";
  var widgetBorderColor = script.dataset.widgetBorderColor || "#000000";
  var widgetUseCustomColors = String(script.dataset.widgetUseCustomColors || "").toLowerCase() === "true";
  var tier1LabelText = script.dataset.tier1LabelText || "Discount";
  var tier2LabelText = script.dataset.tier2LabelText || "Free shipping";
  var minAmountPrefixText = script.dataset.minAmountPrefixText || "Min.";
  var showTierIcons = String(script.dataset.showTierIcons || "true").toLowerCase() !== "false";
  var showTierLabels = String(script.dataset.showTierLabels || "true").toLowerCase() !== "false";
  var showTierMinimums = String(script.dataset.showTierMinimums || "true").toLowerCase() !== "false";
  var showHeading = true;
  var showSubheading = true;
  var showTier1Heading = true;
  var showTier1Subheading = true;
  var showTier2Heading = true;
  var showTier2Subheading = true;
  var showHint = true;
  var barFillColor = "#166534";
  var barTrackColor = "#cbd5e1";
  var iconBackgroundColor = "#166534";
  var iconTextColor = "#ffffff";
  var headingColor = "#0f172a";
  var subheadingColor = "#334155";
  var tierHeadingColor = "#0f172a";
  var tierSubheadingColor = "#334155";
  var hintColor = "#64748b";
  var sequentialMsg0 =
    script.dataset.sequentialMsg0 ||
    "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.";
  var sequentialMsg1 =
    script.dataset.sequentialMsg1 ||
    "Apply discount to unlock free shipping";
  var sequentialMsg2 =
    script.dataset.sequentialMsg2 ||
    "Free shipping unlocked";
  var storeMoneyFormat = script.dataset.moneyFormat || "";

  /** Merged progress bar design from cart-access (includes barStyle for premium tier bar). */
  var lastProgressBarDesign = null;

  function defaultBarStyleStorefront() {
    function phInactive() {
      return {
        barFill: "",
        barTrack: "",
        badgeBackgroundColor: "#ffffff",
        badgeBorderColor: "#000000",
        badgeShadow: "0 0 0 2px #ffffff, 0 2px 10px rgba(0,0,0,0.08)",
        iconColor: "#000000",
        iconSizePx: 15,
        labelColor: "",
        priceLabelColor: "",
      };
    }
    function phActive() {
      return {
        barFill: "#000000",
        barTrack: "",
        badgeBackgroundColor: "#000000",
        badgeBorderColor: "#ffffff",
        badgeShadow: "0 0 0 2px #ffffff, 0 2px 12px rgba(0,0,0,0.2)",
        iconColor: "#ffffff",
        iconSizePx: 15,
        labelColor: "",
        priceLabelColor: "",
      };
    }
    return {
      barMaxWidthPx: 0,
      barHeightPx: 10,
      barBorderRadiusPx: 999,
      barSectionMarginTopPx: 30,
      barSectionMarginBottomPx: 6,
      badgeSizePx: 46,
      captionGapPx: 18,
      transitionMs: 280,
      badgeHoverScalePercent: 104,
      tier1: { before: phInactive(), after: phActive() },
      tier2: { before: phInactive(), after: phActive() },
    };
  }

  function storefrontBarStyle() {
    var bs = lastProgressBarDesign && lastProgressBarDesign.barStyle;
    return bs && typeof bs === "object" ? bs : defaultBarStyleStorefront();
  }

  function resolveSeqBarColors(bs, baseFill, baseTrack, tier1Complete, tier2Complete) {
    var t1b = (bs.tier1 && bs.tier1.before) || {};
    var t1a = (bs.tier1 && bs.tier1.after) || {};
    var t2b = (bs.tier2 && bs.tier2.before) || {};
    var t2a = (bs.tier2 && bs.tier2.after) || {};
    var fill = baseFill;
    var track = baseTrack;
    if (!tier1Complete) {
      if (t1b.barFill) fill = t1b.barFill;
      if (t1b.barTrack) track = t1b.barTrack;
    } else if (!tier2Complete) {
      if (t2b.barFill) fill = t2b.barFill;
      else if (t1a.barFill) fill = t1a.barFill;
      if (t2b.barTrack) track = t2b.barTrack;
      else if (t1a.barTrack) track = t1a.barTrack;
    } else {
      if (t2a.barFill) fill = t2a.barFill;
      if (t2a.barTrack) track = t2a.barTrack;
    }
    return { fill: fill, track: track };
  }

  /** ISO 4217 currencies with zero minor units (Shopify cart amounts are in those units, not ×100). */
  var ZERO_DECIMAL_CURRENCIES = {
    BIF: true,
    CLP: true,
    DJF: true,
    GNF: true,
    JPY: true,
    KMF: true,
    KRW: true,
    MGA: true,
    PYG: true,
    RWF: true,
    UGX: true,
    VND: true,
    VUV: true,
    XAF: true,
    XOF: true,
    XPF: true,
  };

  function getShopCurrencyExponent(cart) {
    var cur =
      (cart && cart.currency) ||
      (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) ||
      "";
    cur = String(cur).toUpperCase().trim();
    if (!cur) return 2;
    if (ZERO_DECIMAL_CURRENCIES[cur]) return 0;
    return 2;
  }

  /** Convert admin/theme amounts (major units) to the same minor units Shopify uses in /cart.js. */
  function majorUnitsToCartMinor(amountMajor, exp) {
    var n = Number(amountMajor);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * Math.pow(10, exp));
  }

  function toMinorInt(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
    if (typeof value === "string" && String(value).trim() !== "") {
      var parsed = Number(String(value).trim());
      if (Number.isFinite(parsed)) return Math.round(parsed);
    }
    return null;
  }

  var currencyExponentAtBoot = getShopCurrencyExponent(null);
  var thresholdCents = Math.max(0, majorUnitsToCartMinor(thresholdValue, currencyExponentAtBoot));
  var shippingChargeCents = Math.max(0, majorUnitsToCartMinor(shippingChargeValue, currencyExponentAtBoot));
  var tiers = parseTiers(script.dataset.tiers, shippingChargeCents, currencyExponentAtBoot);
  var cartNameText = script.dataset.cartName || "";
  var defaultNameTargets = [
    ".drawer__header",
    ".drawer__inner",
    ".drawer",
    ".cart-drawer__content",
    ".cart-drawer",
    "cart-drawer",
    "#CartDrawer",
    ".ajaxcart",
    "form[action*='/cart']",
    ".cart__blocks"
  ];
  var parsedNameTargets = (script.dataset.nameTargets || "").split(",").map(function (s) {
    return s.trim();
  }).filter(Boolean);
  var nameTargetSelectors = parsedNameTargets.length ? parsedNameTargets : defaultNameTargets;
  var selectorTargets = (script.dataset.targets || "").split(",").map(function (s) {
    return s.trim();
  }).filter(Boolean);
  /** Section Shipping Progress block: render only inside this script's mount node (#sce-fs-mount-…). */
  var pinnedMountSelector = (script.dataset.fsMountRoot || "").trim();
  var defaultWidgetTargets = [
    ".sce-free-shipping-widget",
    ".drawer__inner",
    ".cart-drawer__content",
    "cart-drawer",
    "[id*='CartDrawer']",
    "[id*='cart']",
    "form[action*='/cart']",
    ".cart__blocks",
    ".cart__contents",
  ];
  function withDefaultWidgetTargets(targets) {
    var merged = [];
    (targets || []).forEach(function (t) {
      var v = String(t || "").trim();
      if (v && merged.indexOf(v) === -1) merged.push(v);
    });
    defaultWidgetTargets.forEach(function (t) {
      if (merged.indexOf(t) === -1) merged.push(t);
    });
    return merged;
  }
  selectorTargets = withDefaultWidgetTargets(selectorTargets);
  if (pinnedMountSelector) {
    selectorTargets = [pinnedMountSelector];
  }

  var logUrl = (script.dataset.logUrl || "").trim();
  var logEnabled = String(script.dataset.logEnabled || "").toLowerCase() === "true";

  /** Stable per app-block/embed instance so reruns can cleanly reuse same mounts. */
  var injectionScopeId = "sce_" + instanceKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-48);
  /** single (default): keep only one host. multi: render to every matched host. */
  var widgetMountMode = String(script.dataset.widgetMountMode || "single").toLowerCase();
  var allowMultipleWidgetHosts =
    widgetMountMode === "multi" || widgetMountMode === "all" || widgetMountMode === "many";

  if (dynamicTierMode) {
    // Dynamic tiers use a 2-step milestone UI without manual unlock buttons.
    sequentialMode = true;
  }

  var updateTimeout;
  var isApplyingChanges = false;
  var lastUpdateAt = 0;
  var lastPostedCartSig = "";
  var lastTierFetchSig = "";
  var lastTierFetchAt = 0;
  var lastDynamicCartSig = "";
  var lastDynamicSyncAt = 0;
  var logPostTimer;
  var pollIntervalId = null;
  var lastKnownCart = null;

  function uniqueElements(list) {
    var unique = [];
    list.forEach(function (item) {
      if (!item || !(item instanceof Element)) return;
      if (unique.indexOf(item) === -1) unique.push(item);
    });
    return unique;
  }

  function safeMatchesSelector(el, selector) {
    if (!el || !(el instanceof Element) || !selector) return false;
    try {
      return el.matches(selector);
    } catch (_) {
      return false;
    }
  }

  function elementTouchesAnyTarget(el, selectors) {
    if (!el || !(el instanceof Element) || !Array.isArray(selectors) || !selectors.length) return false;
    for (var i = 0; i < selectors.length; i += 1) {
      var sel = selectors[i];
      if (!sel) continue;
      if (safeMatchesSelector(el, sel)) return true;
      try {
        if (el.querySelector(sel)) return true;
      } catch (_) {
        // ignore invalid selectors coming from settings
      }
    }
    return false;
  }

  var proxyFetchWarned = false;
  var cartAccessProxyFailed = false;
  var hasInlineStorefrontConfig = false;

  function readInlineStorefrontConfig() {
    var el = document.getElementById("sce-inline-storefront-config");
    if (!el) return null;
    var raw = String(el.textContent || "").trim();
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function applyCartAccessPayload(data, cart) {
    if (!data || !data.ok) return false;
    if (data.sequentialMsg0) sequentialMsg0 = String(data.sequentialMsg0);
    if (data.sequentialMsg1) sequentialMsg1 = String(data.sequentialMsg1);
    if (data.sequentialMsg2) sequentialMsg2 = String(data.sequentialMsg2);
    if (data.sequentialHintZero) sequentialHintZero = String(data.sequentialHintZero);
    if (data.sequentialHintMid) sequentialHintMid = String(data.sequentialHintMid);
    if (data.tier1Icon) tier1Icon = String(data.tier1Icon);
    if (data.tier2Icon) tier2Icon = String(data.tier2Icon);
    if (data.subtotalLabel) subtotalLabel = String(data.subtotalLabel);
    if (data.estimatedShippingLabel)
      estimatedShippingLabel = String(data.estimatedShippingLabel);
    if (data.widgetBackgroundColor) widgetBackgroundColor = String(data.widgetBackgroundColor);
    if (data.widgetTextColor) widgetTextColor = String(data.widgetTextColor);
    if (data.widgetBorderColor) widgetBorderColor = String(data.widgetBorderColor);
    widgetUseCustomColors = Boolean(data.widgetUseCustomColors);
    if (data.tier1LabelText) tier1LabelText = String(data.tier1LabelText);
    if (data.tier2LabelText) tier2LabelText = String(data.tier2LabelText);
    if (data.tier1LabelText) tier1Label = tier1LabelText;
    if (data.tier2LabelText) tier2Label = tier2LabelText;
    if (data.minAmountPrefixText) minAmountPrefixText = String(data.minAmountPrefixText);
    showTierIcons = data.showTierIcons !== false;
    showTierLabels = data.showTierLabels !== false;
    showTierMinimums = data.showTierMinimums !== false;
    var dynamic = data.widgetDynamicConfig;
    if (dynamic && typeof dynamic === "object") {
      showHeading = dynamic.showHeading !== false;
      showSubheading = dynamic.showSubheading !== false;
      showTier1Heading = dynamic.showTier1Heading !== false;
      showTier1Subheading = dynamic.showTier1Subheading !== false;
      showTier2Heading = dynamic.showTier2Heading !== false;
      showTier2Subheading = dynamic.showTier2Subheading !== false;
      showHint = dynamic.showHint !== false;
      if (dynamic.barFillColor) barFillColor = String(dynamic.barFillColor);
      if (dynamic.barTrackColor) barTrackColor = String(dynamic.barTrackColor);
      if (dynamic.iconBackgroundColor) iconBackgroundColor = String(dynamic.iconBackgroundColor);
      if (dynamic.iconTextColor) iconTextColor = String(dynamic.iconTextColor);
      if (dynamic.headingColor) headingColor = String(dynamic.headingColor);
      if (dynamic.subheadingColor) subheadingColor = String(dynamic.subheadingColor);
      if (dynamic.tierHeadingColor) tierHeadingColor = String(dynamic.tierHeadingColor);
      if (dynamic.tierSubheadingColor) tierSubheadingColor = String(dynamic.tierSubheadingColor);
      if (dynamic.hintColor) hintColor = String(dynamic.hintColor);
    }
    if (data.sequentialTitle) sequentialTitle = String(data.sequentialTitle);
    if (data.progressBarDesign && typeof data.progressBarDesign === "object") {
      lastProgressBarDesign = data.progressBarDesign;
    }
    if (data.selectorTargets && !pinnedMountSelector) {
      var parsedTargets = String(data.selectorTargets)
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      selectorTargets = withDefaultWidgetTargets(parsedTargets);
    }
    if (data.nameTargetSelectors && !pinnedMountSelector) {
      var parsedNameTargets = String(data.nameTargetSelectors)
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (parsedNameTargets.length) nameTargetSelectors = parsedNameTargets;
    }
    var prismaTierRows = Array.isArray(data.tiers) ? data.tiers : [];
    var mapped = mapPrismaTiersToLegacyShippingTiers(prismaTierRows);
    if (!mapped || mapped.length === 0) {
      tiers = [];
      applyDynamicTierLabels([]);
      return true;
    }
    var exp = getShopCurrencyExponent(cart);
    var nextTiers = parseTiers(JSON.stringify(mapped), shippingChargeCents, exp);
    tiers = nextTiers;
    applyDynamicTierLabels(prismaTierRows);
    return true;
  }

  var bootInlineConfig = readInlineStorefrontConfig();
  if (bootInlineConfig) {
    hasInlineStorefrontConfig = applyCartAccessPayload(bootInlineConfig, null);
    cartAccessProxyFailed = false;
  }

  function alternateShortCartAccessPath(primaryBase) {
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

  function buildCartAccessFetchUrls(baseLogUrl, subtotalCents, currencyCode) {
    var primary = String(baseLogUrl || "").trim();
    if (!primary) return [];
    var bases = uniqueStrings([
      primary,
      alternateShortCartAccessPath(primary),
      "/apps/sce/cart-access",
      "/cart-access",
    ]);
    var qs =
      "subtotalCents=" + encodeURIComponent(String(subtotalCents || 0)) +
      (currencyCode ? "&currency=" + encodeURIComponent(currencyCode) : "");
    return bases.map(function (base) {
      if (base.indexOf("?") === -1) return base + "?" + qs;
      return base + "&" + qs;
    });
  }

  function fetchCartAccessJson(urls, index) {
    if (!urls || !urls.length || index >= urls.length) {
      cartAccessProxyFailed = true;
      return Promise.resolve(null);
    }
    var url = urls[index];
    return fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(function (r) {
        var ct = String(r.headers.get("content-type") || "").toLowerCase();
        var looksLikeJson =
          ct.indexOf("application/json") !== -1 || ct.indexOf("text/json") !== -1;
        if (!looksLikeJson) {
          if (index + 1 < urls.length) return fetchCartAccessJson(urls, index + 1);
          if (!proxyFetchWarned) {
            proxyFetchWarned = true;
            console.warn(
              "[SCE] App proxy returned non-JSON for cart-access:",
              url,
              "HTTP",
              r.status,
              "- Run shopify app dev (or deploy), enable write_app_proxy, and open https://YOUR-STORE.myshopify.com/apps/sce/health on the storefront.",
            );
          }
          return null;
        }
        if (!r.ok) {
          if (index + 1 < urls.length) return fetchCartAccessJson(urls, index + 1);
          if (!proxyFetchWarned) {
            proxyFetchWarned = true;
            console.warn(
              "[SCE] App proxy request failed:",
              url,
              "HTTP",
              r.status,
              "- Run shopify app deploy, enable write_app_proxy, and open https://YOUR-STORE.myshopify.com/apps/sce/health in the browser.",
            );
          }
          return null;
        }
        return r.json().then(function (data) {
          if (data && data.error === "app_proxy_auth_failed" && !proxyFetchWarned) {
            proxyFetchWarned = true;
            console.warn("[SCE] App proxy auth failed:", data.hint || data.error);
          }
          if (data && data.ok === true) {
            cartAccessProxyFailed = false;
            return data;
          }
          var retryable =
            !data ||
            data.error === "app_proxy_auth_failed" ||
            data.error === "missing_shop";
          if (index + 1 < urls.length && retryable) {
            return fetchCartAccessJson(urls, index + 1);
          }
          return data;
        });
      })
      .catch(function () {
        if (index + 1 < urls.length) return fetchCartAccessJson(urls, index + 1);
        return null;
      });
  }

  function safeFetchJson(url) {
    return fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) {
          if (!proxyFetchWarned) {
            proxyFetchWarned = true;
            console.warn(
              "[SCE] App proxy request failed:",
              url,
              "HTTP",
              r.status,
              "- Run shopify app deploy, enable write_app_proxy, and open https://YOUR-STORE.myshopify.com/apps/sce/health in the browser.",
            );
          }
          throw new Error("Request failed");
        }
        return r.json();
      })
      .then(function (data) {
        if (data && data.error === "app_proxy_auth_failed" && !proxyFetchWarned) {
          proxyFetchWarned = true;
          console.warn("[SCE] App proxy auth failed:", data.hint || data.error);
        }
        return data;
      })
      .catch(function () {
        return null;
      });
  }

  function mapPrismaTiersToLegacyShippingTiers(prismaTiers) {
    if (!Array.isArray(prismaTiers)) return null;
    return prismaTiers
      .filter(function (t) {
        return t && t.active !== false;
      })
      .map(function (t) {
        var min = Number(t.minSubtotal || 0);
        var isFreeShip = String(t.rewardType || "").toUpperCase() === "FREE_SHIPPING";
        return {
          min: Number.isFinite(min) ? min : 0,
          max: null,
          shipping: isFreeShip ? 0 : shippingChargeValue,
          message: t.message ? String(t.message) : "",
        };
      })
      .sort(function (a, b) {
        return a.min - b.min;
      });
  }

  function applyDynamicTierLabels(prismaTiers) {
    if (!Array.isArray(prismaTiers) || prismaTiers.length === 0) {
      tier1LabelText = "Tier 1";
      tier2LabelText = "Tier 2";
      tier1Label = tier1LabelText;
      tier2Label = tier2LabelText;
      return;
    }
    var active = prismaTiers.filter(function (t) { return t && t.active !== false; });
    active.sort(function (a, b) { return Number(a.minSubtotal || 0) - Number(b.minSubtotal || 0); });
    var t1 = active[0];
    var t2 = active.length > 1 ? active[1] : null;
    if (t1) {
      tier1LabelText = String(t1.name || "Tier 1").trim() || "Tier 1";
      tier1Label = tier1LabelText;
      var r1 = String(t1.rewardType || "").toUpperCase();
      var v1 = Number(t1.discountPercent || 0);
      if (r1 === "FREE_SHIPPING") {
        tier1TagText = tier1LabelText;
      } else if (r1 === "FIXED_AMOUNT") {
        tier1TagText =
          v1 > 0
            ? formatMoney(majorUnitsToCartMinor(v1, currencyExponentAtBoot)) + " OFF"
            : "Fixed amount";
      } else {
        tier1TagText = v1 > 0 ? String(v1.toFixed(0)) + "% OFF" : tier1LabelText;
      }
    }
    if (t2) {
      tier2LabelText = String(t2.name || "Tier 2").trim() || "Tier 2";
      tier2Label = tier2LabelText;
      var r2 = String(t2.rewardType || "").toUpperCase();
      var v2 = Number(t2.discountPercent || 0);
      if (r2 === "FREE_SHIPPING") {
        tier2TagText = tier2LabelText;
      } else if (r2 === "FIXED_AMOUNT") {
        tier2TagText =
          v2 > 0
            ? formatMoney(majorUnitsToCartMinor(v2, currencyExponentAtBoot)) + " OFF"
            : "Fixed amount";
      } else {
        tier2TagText = v2 > 0 ? String(v2.toFixed(0)) + "% OFF" : tier2LabelText;
      }
    } else {
      tier2LabelText = "";
      tier2Label = "";
    }
  }

  function refreshDynamicTiersWithCart(cart) {
    if (!dynamicTierMode || !logUrl) return Promise.resolve(false);
    cartAccessProxyFailed = false;
    var subtotalCents = getCartSubtotalCents(cart);
    var cur = cart && cart.currency ? String(cart.currency).trim() : "";
    var fetchSig = String(subtotalCents || 0) + "_" + cur;
    var now = Date.now();
    // Prevent request storms when observers/events fire repeatedly with same cart snapshot.
    if (fetchSig === lastTierFetchSig && now - lastTierFetchAt < 1500) {
      return Promise.resolve(false);
    }
    lastTierFetchSig = fetchSig;
    lastTierFetchAt = now;
    var urls = buildCartAccessFetchUrls(logUrl, subtotalCents, cur);
    return fetchCartAccessJson(urls, 0).then(function (data) {
      if (!data || !data.ok) {
        if (!hasInlineStorefrontConfig) {
          tiers = [];
          applyDynamicTierLabels([]);
        }
        cartAccessProxyFailed = !hasInlineStorefrontConfig;
        return false;
      }
      cartAccessProxyFailed = false;
      return applyCartAccessPayload(data, cart);
    });
  }

  /** If both .drawer and .drawer__inner match, keep only the inner node so we render one bar / one name row. */
  function keepDeepestHosts(hosts) {
    return hosts.filter(function (h) {
      return !hosts.some(function (o) {
        return o !== h && o.contains(h);
      });
    });
  }

  /**
   * cart-access may return broad selectors (e.g. .product__info-container). Those ancestors also match
   * .sce-free-shipping-widget inside them; keepDeepestHosts would keep only the parent and drop the app
   * block root - wrong mount and missing premium styling. Prefer explicit Shipping Progress block hosts.
   */
  function preferSceBlockHosts(hosts) {
    if (!hosts || !hosts.length) return hosts;
    if (pinnedMountSelector) {
      var pinned = hosts.filter(function (h) {
        try {
          return safeMatchesSelector(h, pinnedMountSelector);
        } catch (_) {
          return false;
        }
      });
      var nonPinned = hosts.filter(function (h) {
        try {
          return !safeMatchesSelector(h, pinnedMountSelector);
        } catch (_) {
          return true;
        }
      });
      var merged = [];
      if (pinned.length) merged = merged.concat(keepDeepestHosts(pinned));
      if (nonPinned.length) merged = merged.concat(keepDeepestHosts(nonPinned));
      merged = uniqueElements(merged);
      return keepDeepestHosts(merged);
    }
    var direct = hosts.filter(function (h) {
      return safeMatchesSelector(h, ".sce-free-shipping-widget");
    });
    if (direct.length) return keepDeepestHosts(direct);
    return keepDeepestHosts(hosts);
  }

  function isCartDrawerHost(host) {
    if (!host || !(host instanceof Element)) return false;
    return !!host.closest(
      "cart-drawer, .cart-drawer, .drawer, [id*='CartDrawer'], [class*='cart-drawer']"
    );
  }

  /** Drawer / cart UI root so orphan cleanup still matches when placeWidget inserts next to a header sibling of `host`. */
  function mountingRegionForHost(host) {
    if (!host || !(host instanceof Element)) return null;
    var cartShell = host.closest("cart-drawer, [id*='CartDrawer'], .cart-drawer, .drawer");
    if (cartShell && cartShell.contains(host)) return cartShell;
    return host;
  }

  function visibleHostViewportScore(host) {
    if (!host || !(host instanceof Element)) return 0;
    var r = host.getBoundingClientRect();
    var w = window.innerWidth || 0;
    var h = window.innerHeight || 0;
    var x1 = Math.max(0, Math.min(r.right, w) - Math.max(0, r.left));
    var y1 = Math.max(0, Math.min(r.bottom, h) - Math.max(0, r.top));
    return Math.max(0, x1) * Math.max(0, y1);
  }

  function findOpenCartContainer() {
    return document.querySelector(
      "cart-drawer[open], cart-drawer:not([aria-hidden='true']), .cart-drawer.is-open, .drawer.is-open, #CartDrawer:not([aria-hidden='true'])"
    );
  }

  /**
   * When only one widget should exist: prefer an open cart/drawer host, else the most visible
   * target, else document order. Works with any theme; pairs with removeOrphanInjectedWidgets.
   */
  function pickSingleWidgetHost(hosts) {
    if (!hosts || hosts.length <= 1) return hosts;
    var open = findOpenCartContainer();
    if (open) {
      var inOpen = hosts.filter(function (h) {
        return open.contains(h);
      });
      if (inOpen.length) {
        var deep = keepDeepestHosts(inOpen);
        deep.sort(function (a, b) {
          var pos = a.compareDocumentPosition(b);
          if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
          if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
          return 0;
        });
        return [deep[0]];
      }
    }
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < hosts.length; i += 1) {
      var sc = visibleHostViewportScore(hosts[i]);
      if (sc > bestScore) {
        bestScore = sc;
        best = hosts[i];
      }
    }
    if (best && bestScore > 0) return [best];
    var sorted = hosts.slice().sort(function (a, b) {
      var pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    return [sorted[0]];
  }

  function removeOrphanInjectedWidgets(validHosts) {
    // Empty host list must not delete widgets: many themes omit cart drawer innards when the cart
    // is empty, so selectors match nothing briefly - removing here would strip the tier UI until
    // a full page reload.
    if (!validHosts || !validHosts.length) return;
    var regions = validHosts.map(mountingRegionForHost).filter(Boolean);
    document.querySelectorAll('.sce-free-shipping-widget[data-sce-scope="' + injectionScopeId + '"]').forEach(function (node) {
      var ok = regions.some(function (r) {
        return r.contains(node);
      });
      if (!ok) node.remove();
    });
  }

  /**
   * placeWidget() can reparent the root outside `host` (e.g. next to drawer header). The next
   * update must reuse that node - not create another - or the drawer stacks duplicate widgets.
   */
  function findInjectedWidgetRootInHostRegion(host) {
    if (!host) return null;
    var region = mountingRegionForHost(host);
    if (!region) return null;
    return region.querySelector('[data-sce-scope="' + injectionScopeId + '"]');
  }

  /** Safety net if multiple copies with this script's scope accumulated (reparent + missed reuse). */
  function dedupeInjectedWidgetsInOpenCart() {
    if (allowMultipleWidgetHosts) return;
    var open = findOpenCartContainer();
    if (!open) return;
    var nodes = open.querySelectorAll('.sce-free-shipping-widget[data-sce-scope="' + injectionScopeId + '"]');
    if (nodes.length <= 1) return;
    for (var i = 1; i < nodes.length; i += 1) {
      nodes[i].remove();
    }
  }

  /**
   * On product pages, many themes (e.g. Wokiee) repeat wrappers or side columns so the same
   * selector matches several siblings. keepDeepestHosts only drops ancestors, not siblings.
   * Keep one non-drawer mount: hosts that co ntain the primary add-to-cart form (largest in
   * main), else the first non-drawer host in document order. Drawer/cart targets unchanged.
   */
  function dedupeWidgetHostsAcrossThemes(hosts) {
    if (!hosts || hosts.length <= 1) return hosts;
    var drawerRelated = [];
    var nonDrawer = [];
    for (var i = 0; i < hosts.length; i += 1) {
      var h = hosts[i];
      if (isCartDrawerHost(h)) drawerRelated.push(h);
      else nonDrawer.push(h);
    }
    if (nonDrawer.length <= 1) return hosts;

    var onProductPage = /\/products\//i.test(window.location.pathname || "");
    if (!onProductPage) return hosts;

    var main = document.querySelector("main, #MainContent, [role='main'], .main-content");
    var forms = main ? main.querySelectorAll("form[action*='/cart/add']") : [];
    var primaryForm = null;
    if (forms && forms.length) {
      var bestArea = -1;
      for (var fi = 0; fi < forms.length; fi += 1) {
        var f = forms[fi];
        var r = f.getBoundingClientRect();
        var area = Math.max(0, r.width) * Math.max(0, r.height);
        if (area > bestArea) {
          bestArea = area;
          primaryForm = f;
        }
      }
    }

    var chosenNonDrawer;
    if (primaryForm) {
      var preferred = [];
      for (var j = 0; j < nonDrawer.length; j += 1) {
        if (nonDrawer[j].contains(primaryForm)) preferred.push(nonDrawer[j]);
      }
      chosenNonDrawer = preferred.length ? keepDeepestHosts(preferred) : null;
    }

    if (!chosenNonDrawer || !chosenNonDrawer.length) {
      nonDrawer.sort(function (a, b) {
        var pos = a.compareDocumentPosition(b);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });
      chosenNonDrawer = [nonDrawer[0]];
    }

    return uniqueElements(drawerRelated.concat(chosenNonDrawer));
  }

  function formatAmountByToken(cents, token) {
    var precision = token.indexOf("no_decimals") !== -1 ? 0 : 2;
    var thousands = token.indexOf("comma_separator") !== -1 ? "." : ",";
    var decimal = token.indexOf("comma_separator") !== -1 ? "," : ".";
    var value = cents / 100;
    if (token.indexOf("no_decimals") !== -1) {
      value = Math.round(value);
    }
    var fixed = value.toFixed(precision);
    var parts = fixed.split(".");
    var whole = parts[0];
    var fraction = parts.length > 1 ? parts[1] : "";
    whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    if (!precision) return whole;
    return whole + decimal + fraction;
  }

  function formatUsingMoneyFormat(cents, moneyFormat) {
    if (!moneyFormat) return null;
    var tokenMatch = moneyFormat.match(/\{\{\s*(\w+)\s*\}\}/);
    if (!tokenMatch) return null;
    var token = tokenMatch[1];
    var amount = formatAmountByToken(cents, token);
    return moneyFormat.replace(tokenMatch[0], amount);
  }

  function stripTrailingZeroDecimals(str) {
    return str.replace(/([.,])00(?=\s|$|[^0-9])/g, "").replace(/([.,])00$/, "");
  }

  function formatMoney(cents, shopifyMoneyFormat) {
    var activeFormat = shopifyMoneyFormat || storeMoneyFormat || window.Shopify?.money_format || "";
    if (window.Shopify && typeof window.Shopify.formatMoney === "function") {
      try {
        return stripTrailingZeroDecimals(
          window.Shopify.formatMoney(cents, activeFormat || window.Shopify.money_format)
        );
      } catch (e) {
        /* fallback below */
      }
    }

    var formatted = formatUsingMoneyFormat(cents, activeFormat);
    if (formatted) return stripTrailingZeroDecimals(formatted);

    return stripTrailingZeroDecimals(
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || "USD",
      }).format(cents / 100)
    );
  }

  function parseTiers(raw, defaultShippingCents, currencyExp) {
    var exp = typeof currencyExp === "number" && Number.isFinite(currencyExp) ? currencyExp : 2;
    var fallback = [
      { minCents: thresholdCents, maxCents: null, shippingCents: 0, message: reachedText }
    ];
    if (!raw) return fallback;
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return fallback;
      var normalized = parsed
        .map(function (tier) {
          var min = Number(tier && tier.min);
          var max = tier && tier.max != null ? Number(tier.max) : null;
          var shipping = Number(tier && tier.shipping);
          var message = tier && tier.message ? String(tier.message) : "";
          return {
            minCents: Number.isFinite(min) ? Math.max(0, majorUnitsToCartMinor(min, exp)) : 0,
            maxCents: Number.isFinite(max) ? Math.max(0, majorUnitsToCartMinor(max, exp)) : null,
            shippingCents: Number.isFinite(shipping)
              ? Math.max(0, majorUnitsToCartMinor(shipping, exp))
              : defaultShippingCents,
            message: message,
          };
        })
        .filter(function (tier) {
          return tier.maxCents == null || tier.maxCents >= tier.minCents;
        })
        .sort(function (a, b) {
          return a.minCents - b.minCents;
        });
      return normalized.length ? normalized : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function firstFreeTierMinCents() {
    for (var i = 0; i < tiers.length; i += 1) {
      if (tiers[i].shippingCents === 0) return tiers[i].minCents;
    }
    return thresholdCents;
  }

  /** How many milestone columns to show: 1 or 2 (sequential UI supports at most two). */
  function getDisplayedSequentialTierCount() {
    if (!tiers || tiers.length === 0) {
      return dynamicTierMode ? 0 : 1;
    }
    if (dynamicTierMode) {
      return Math.min(2, Math.max(1, tiers.length));
    }
    var mins = tiers
      .map(function (tier) {
        return Number(tier && tier.minCents);
      })
      .filter(function (v) {
        return Number.isFinite(v) && v >= 0;
      })
      .sort(function (a, b) {
        return a - b;
      });
    var unique = [];
    for (var i = 0; i < mins.length; i += 1) {
      if (!unique.length || unique[unique.length - 1] !== mins[i]) unique.push(mins[i]);
    }
    if (unique.length <= 1) return 1;
    return 2;
  }

  function setStepSubText(subEl, labelText, subText) {
    if (!subEl) return;
    var st = (subText || "").trim();
    var lt = (labelText || "").trim();
    if (!st || st.toLowerCase() === lt.toLowerCase()) {
      subEl.textContent = "";
    } else {
      subEl.textContent = subText;
    }
  }

  /** Normalize theme icon tokens (e.g. "truck") for display inside badges. */
  function tierIconDisplay(raw, fallback) {
    var t = String(raw == null ? "" : raw).trim();
    if (!t) return fallback;
    if (t.toLowerCase() === "truck") return "🚚";
    return t;
  }

  function setStepMinAmount(el, minCents) {
    if (!el) return;
    if (!Number.isFinite(minCents) || minCents <= 0) {
      el.textContent = "";
      el.setAttribute("aria-hidden", "true");
      return;
    }
    el.removeAttribute("aria-hidden");
    el.textContent = (minAmountPrefixText || "Min.") + " " + formatMoney(minCents);
  }

  function applyWidgetColors(root) {
    if (!root) return;
    if (widgetBackgroundColor) root.style.backgroundColor = widgetBackgroundColor;
    else root.style.backgroundColor = "";
    root.style.borderColor = "#000000";
    root.style.borderWidth = "1px";
    root.style.borderStyle = "solid";
    if (widgetUseCustomColors) {
      if (widgetTextColor) {
        root.style.color = widgetTextColor;
        var colorTargets = root.querySelectorAll(
          ".sce-free-shipping-widget__title, .sce-free-shipping-widget__message, .sce-free-shipping-widget__hint, .sce-seq-title, .sce-seq-message, .sce-seq-hint, .sce-seq-bar-cap__label, .sce-seq-bar-cap__price, .sce-milestone"
        );
        for (var i = 0; i < colorTargets.length; i += 1) {
          colorTargets[i].style.color = widgetTextColor;
        }
      }
    } else {
      root.style.color = "";
      var resetTargets = root.querySelectorAll(
        ".sce-free-shipping-widget__title, .sce-free-shipping-widget__message, .sce-free-shipping-widget__hint, .sce-seq-title, .sce-seq-message, .sce-seq-hint, .sce-seq-bar-cap__label, .sce-seq-bar-cap__price, .sce-milestone"
      );
      for (var r = 0; r < resetTargets.length; r += 1) resetTargets[r].style.color = "";
    }
  }

  /** Dynamic tier targets for UI progress: Tier 1 (discount), Tier 2 (free shipping). */
  function getSequentialTargetsCents() {
    var mins = tiers
      .map(function (tier) {
        return Number(tier && tier.minCents);
      })
      .filter(function (v) {
        return Number.isFinite(v) && v >= 0;
      })
      .sort(function (a, b) {
        return a - b;
      });

    var tier1 = mins.length ? mins[0] : thresholdCents;
    var tier2 = mins.length > 1 ? mins[1] : firstFreeTierMinCents();
    if (!Number.isFinite(tier2) || tier2 < 0) tier2 = tier1 >= 0 ? tier1 : 0;
    if (tier2 < tier1) tier2 = tier1;
    return { tier1Cents: tier1, tier2Cents: tier2 };
  }

  function resolveTier(subtotalCents) {
    for (var i = 0; i < tiers.length; i += 1) {
      var tier = tiers[i];
      if (subtotalCents < tier.minCents) continue;
      if (tier.maxCents == null || subtotalCents <= tier.maxCents) return tier;
    }
    return null;
  }

  function getCartSubtotalCents(cart) {
    if (!cart) return 0;
    var cents = toMinorInt(cart.items_subtotal_price);
    if (cents != null) return cents;
    cents = toMinorInt(cart.original_total_price);
    if (cents != null) return cents;
    cents = toMinorInt(cart.total_price);
    if (cents != null) return cents;
    if (Array.isArray(cart.items) && cart.items.length) {
      var sum = 0;
      var any = false;
      for (var i = 0; i < cart.items.length; i += 1) {
        var li = cart.items[i];
        var line = toMinorInt(li && (li.final_line_price != null ? li.final_line_price : li.line_price));
        if (line != null) {
          sum += line;
          any = true;
        }
      }
      if (any) return sum;
    }
    return 0;
  }

  function getSequentialLevelFromCart(cart) {
    if (!cart || !cart.attributes) return 0;
    var raw = cart.attributes[unlockAttributeKey];
    if (raw == null || raw === "") return 0;
    var n = parseInt(String(raw).trim(), 10);
    if (n === 1 || n === 2) return n;
    return 0;
  }

  var sequentialClickBound = false;
  function bindSequentialUnlockClicks() {
    if (sequentialClickBound || !sequentialMode) return;
    sequentialClickBound = true;
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var btn = t.closest(".sce-tier-unlock-btn");
      if (!btn || btn.disabled || btn.classList.contains("is-done")) return;
      var widget = btn.closest(".sce-free-shipping-widget--sequential");
      if (!widget) return;
      var tier = btn.getAttribute("data-unlock-tier");
      if (tier !== "1" && tier !== "2") return;
      var key = widget.getAttribute("data-unlock-key") || unlockAttributeKey;
      e.preventDefault();
      btn.classList.add("is-loading");
      var payload = {};
      payload[key] = tier;
      fetch("/cart/update.js", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: payload }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Cart update failed");
          return r.json();
        })
        .then(function () {
          debouncedUpdate();
        })
        .catch(function () {
          /* ignore */
        })
        .finally(function () {
          btn.classList.remove("is-loading");
        });
    });
  }

  /** 2-step tier progress UI: premium bar + scalloped badges + captions aligned to badges. */
  var SEQUENTIAL_WIDGET_INNER =
    '<div class="sce-free-shipping-widget__title sce-seq-title"></div>' +
    '<div class="sce-free-shipping-widget__message sce-seq-message"></div>' +
    '<div class="sce-seq-bar-stack">' +
    '<div class="sce-free-shipping-widget__bar sce-seq-main-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
    '<div class="sce-free-shipping-widget__bar-fill sce-seq-main-bar-fill"></div>' +
    '<div class="sce-seq-main-bar-point sce-seq-main-bar-point--tier1" aria-hidden="true"><span class="sce-seq-main-bar-point__icon">%</span></div>' +
    '<div class="sce-seq-main-bar-point sce-seq-main-bar-point--tier2" aria-hidden="true"><span class="sce-seq-main-bar-point__icon">🚚</span></div>' +
    "</div>" +
    '<div class="sce-seq-bar-caps">' +
    '<div class="sce-seq-bar-cap sce-seq-bar-cap--1">' +
    '<div class="sce-seq-bar-cap__label"></div>' +
    '<div class="sce-seq-bar-cap__price"></div>' +
    "</div>" +
    '<div class="sce-seq-bar-cap sce-seq-bar-cap--2">' +
    '<div class="sce-seq-bar-cap__label"></div>' +
    '<div class="sce-seq-bar-cap__price"></div>' +
    "</div>" +
    "</div>" +
    "</div>" +
    '<div class="sce-free-shipping-widget__hint sce-seq-hint"></div>';

  function renderSequentialWidget(host, cart) {
    if (!host) return;
    if (!dynamicTierMode) {
      bindSequentialUnlockClicks();
    }

    var level = getSequentialLevelFromCart(cart);
    var subtotalCents = getCartSubtotalCents(cart);
    var tierCount = getDisplayedSequentialTierCount();

    if (dynamicTierMode && tierCount === 0) {
      var rootEmpty = host.classList.contains("sce-free-shipping-widget")
        ? host
        : host.querySelector(".sce-free-shipping-widget");
      if (!rootEmpty) {
        rootEmpty = findInjectedWidgetRootInHostRegion(host);
      }
      if (!rootEmpty) {
        rootEmpty = document.createElement("div");
        rootEmpty.className = "sce-free-shipping-widget sce-free-shipping-widget--sequential";
        rootEmpty.innerHTML = SEQUENTIAL_WIDGET_INNER;
        rootEmpty.setAttribute("data-sce-scope", injectionScopeId);
        rootEmpty.setAttribute("data-sce-injected", "1");
      } else if (!rootEmpty.querySelector(".sce-seq-bar-stack")) {
        rootEmpty.className = "sce-free-shipping-widget sce-free-shipping-widget--sequential";
        rootEmpty.innerHTML = SEQUENTIAL_WIDGET_INNER;
      }
      rootEmpty.classList.add("sce-free-shipping-widget--sequential");
      rootEmpty.classList.toggle("sce-free-shipping-widget--sequential-single", true);
      rootEmpty.classList.toggle("sce-free-shipping-widget--no-active-tiers", true);
      rootEmpty.setAttribute("data-unlock-key", unlockAttributeKey);
      placeWidget(host, rootEmpty);
      ensureWidgetCoreStyles(rootEmpty, true);
      applyWidgetColors(rootEmpty);
      rootEmpty.classList.toggle("sce-free-shipping-widget--sce-primary", !allowMultipleWidgetHosts);

      var titleEmpty = rootEmpty.querySelector(".sce-seq-title");
      var messageEmpty = rootEmpty.querySelector(".sce-seq-message");
      var barStackEmpty = rootEmpty.querySelector(".sce-seq-bar-stack");
      var hintEmpty = rootEmpty.querySelector(".sce-seq-hint");
      if (titleEmpty) {
        titleEmpty.textContent = sequentialTitle;
        titleEmpty.style.display = showHeading ? "" : "none";
        titleEmpty.style.color = headingColor;
      }
      if (messageEmpty) {
        var shopHost =
          (script.dataset.sceShop || "").trim() ||
          (window.Shopify && window.Shopify.shop) ||
          "";
        if (cartAccessProxyFailed && !hasInlineStorefrontConfig) {
          messageEmpty.textContent =
            "Rewards are not connected for " +
            (shopHost || "this store") +
            ". (1) Run npm run dev and pick this store. (2) Open the Geekify app in Shopify admin on " +
            (shopHost || "this store") +
            " and load Home or Discounts once. (3) Run shopify app deploy. (4) Refresh this page. Test: /apps/sce/health should return JSON, not 404.";
        } else {
          messageEmpty.textContent =
            "Hey, please go to the app and create an active tier discount there 😊 After that, it will automatically show up here.";
        }
        messageEmpty.style.display = showSubheading ? "" : "none";
        messageEmpty.style.color = subheadingColor;
      }
      if (barStackEmpty) barStackEmpty.style.display = "none";
      if (hintEmpty) {
        hintEmpty.textContent = subtotalLabel + ": " + formatMoney(subtotalCents);
        hintEmpty.style.display = showHint ? "" : "none";
        hintEmpty.style.color = hintColor;
      }
      rootEmpty.setAttribute("data-seq-progress", "0");
      if (dynamicTierMode) {
        var btnsEmpty = rootEmpty.querySelectorAll(".sce-tier-unlock-btn");
        for (var bi = 0; bi < btnsEmpty.length; bi += 1) {
          btnsEmpty[bi].style.display = "none";
        }
      }
      return;
    }

    var targets = getSequentialTargetsCents();
    var tier1RatioPct =
      tierCount > 1 && Number(targets.tier2Cents) > 0
        ? Math.max(
            0,
            Math.min(100, Math.round((Number(targets.tier1Cents || 0) / Number(targets.tier2Cents)) * 100)),
          )
        : 100;
    var tier1Complete;
    var tier2Eligible;
    var tier2Complete;
    var progressPct;
    if (tierCount === 1) {
      tier1Complete = level >= 1 || subtotalCents >= targets.tier1Cents;
      tier2Eligible = false;
      tier2Complete = false;
      progressPct =
        Number(targets.tier1Cents) > 0
          ? Math.max(0, Math.min(100, Math.round((subtotalCents / Number(targets.tier1Cents)) * 100)))
          : tier1Complete
            ? 100
            : 0;
    } else {
      tier1Complete = level >= 1 || subtotalCents >= targets.tier1Cents;
      tier2Eligible = tier1Complete;
      tier2Complete = tier2Eligible && (level >= 2 || subtotalCents >= targets.tier2Cents);
      progressPct =
        Number(targets.tier2Cents) > 0
          ? Math.max(0, Math.min(100, Math.round((subtotalCents / Number(targets.tier2Cents)) * 100)))
          : tier2Complete
            ? 100
            : tier1Complete
              ? tier1RatioPct
              : 0;
    }

    var root = host.classList.contains("sce-free-shipping-widget")
      ? host
      : host.querySelector(".sce-free-shipping-widget");
    if (!root) {
      root = findInjectedWidgetRootInHostRegion(host);
    }
    if (!root) {
      root = document.createElement("div");
      root.className = "sce-free-shipping-widget sce-free-shipping-widget--sequential";
      root.innerHTML = SEQUENTIAL_WIDGET_INNER;
      root.setAttribute("data-sce-scope", injectionScopeId);
      root.setAttribute("data-sce-injected", "1");
    } else if (!root.querySelector(".sce-seq-bar-stack")) {
      root.className = "sce-free-shipping-widget sce-free-shipping-widget--sequential";
      root.innerHTML = SEQUENTIAL_WIDGET_INNER;
    }

    root.classList.add("sce-free-shipping-widget--sequential");
    root.classList.remove("sce-free-shipping-widget--no-active-tiers");
    root.setAttribute("data-unlock-key", unlockAttributeKey);
    placeWidget(host, root);
    ensureWidgetCoreStyles(root, true);
    applyWidgetColors(root);
    root.classList.toggle("sce-free-shipping-widget--sce-primary", !allowMultipleWidgetHosts);

    var titleEl = root.querySelector(".sce-seq-title");
    var messageEl = root.querySelector(".sce-seq-message");
    var barFill = root.querySelector(".sce-seq-main-bar-fill");
    var mainBar = root.querySelector(".sce-seq-main-bar");
    var barStack = root.querySelector(".sce-seq-bar-stack");
    if (barStack) barStack.style.display = "";
    var cap1 = root.querySelector(".sce-seq-bar-cap--1");
    var cap2 = root.querySelector(".sce-seq-bar-cap--2");
    var cap1Label = cap1 ? cap1.querySelector(".sce-seq-bar-cap__label") : null;
    var cap1Price = cap1 ? cap1.querySelector(".sce-seq-bar-cap__price") : null;
    var cap2Label = cap2 ? cap2.querySelector(".sce-seq-bar-cap__label") : null;
    var cap2Price = cap2 ? cap2.querySelector(".sce-seq-bar-cap__price") : null;
    var hint = root.querySelector(".sce-seq-hint");
    var mainBarPoint1 = root.querySelector(".sce-seq-main-bar-point--tier1");
    var mainBarPoint2 = root.querySelector(".sce-seq-main-bar-point--tier2");
    var mainBarPoint1Icon = mainBarPoint1
      ? mainBarPoint1.querySelector(".sce-seq-main-bar-point__icon")
      : null;
    var mainBarPoint2Icon = mainBarPoint2
      ? mainBarPoint2.querySelector(".sce-seq-main-bar-point__icon")
      : null;

    var bs = storefrontBarStyle();
    var p1 = tier1Complete ? bs.tier1 && bs.tier1.after : bs.tier1 && bs.tier1.before;
    var p2 = tier2Complete ? bs.tier2 && bs.tier2.after : bs.tier2 && bs.tier2.before;
    p1 = p1 || {};
    p2 = p2 || {};
    var resolved = resolveSeqBarColors(bs, barFillColor, barTrackColor, tier1Complete, tier2Complete);
    var badgeSize = Number(bs.badgeSizePx) > 0 ? Number(bs.badgeSizePx) : 46;
    var barH = Number(bs.barHeightPx) > 0 ? Number(bs.barHeightPx) : 10;
    var br = Number(bs.barBorderRadiusPx) >= 0 ? Number(bs.barBorderRadiusPx) : 999;
    var transMs = Number(bs.transitionMs) >= 0 ? Number(bs.transitionMs) : 280;
    var capGap = Number(bs.captionGapPx) >= 0 ? Number(bs.captionGapPx) : 18;
    var mt = Number(bs.barSectionMarginTopPx) >= 0 ? Number(bs.barSectionMarginTopPx) : 30;
    var mb = Number(bs.barSectionMarginBottomPx) >= 0 ? Number(bs.barSectionMarginBottomPx) : 6;
    var hoverSc = Number(bs.badgeHoverScalePercent) >= 100 ? Number(bs.badgeHoverScalePercent) / 100 : 1.04;

    var barInset = Math.ceil(badgeSize / 2) + 4;

    root.style.setProperty("--sce-badge-hover-scale", String(hoverSc));
    if (barStack && Number(bs.barMaxWidthPx) > 0) {
      barStack.style.maxWidth = String(bs.barMaxWidthPx) + "px";
      barStack.style.marginLeft = "auto";
      barStack.style.marginRight = "auto";
    } else if (barStack) {
      barStack.style.maxWidth = "";
      barStack.style.marginLeft = "";
      barStack.style.marginRight = "";
    }

    root.classList.toggle("sce-free-shipping-widget--sequential-single", tierCount === 1);
    var hideSecondTier = tierCount === 1;
    if (cap2) {
      cap2.style.display = hideSecondTier ? "none" : "";
      cap2.setAttribute("aria-hidden", hideSecondTier ? "true" : "false");
    }
    if (mainBarPoint2) {
      mainBarPoint2.style.display = showTierIcons && !hideSecondTier ? "" : "none";
    }

    if (titleEl) titleEl.textContent = sequentialTitle;
    if (titleEl) {
      titleEl.style.display = showHeading ? "" : "none";
      titleEl.style.color = headingColor;
    }

    if (messageEl) {
      if (tierCount === 1) {
        if (tier1Complete) messageEl.textContent = sequentialMsg2;
        else messageEl.textContent = sequentialMsg0;
      } else if (tier2Complete) messageEl.textContent = sequentialMsg2;
      else if (tier1Complete) messageEl.textContent = sequentialMsg1;
      else messageEl.textContent = sequentialMsg0;
      messageEl.style.display = showSubheading ? "" : "none";
      messageEl.style.color = subheadingColor;
    }

    if (mainBar) {
      mainBar.style.height = barH + "px";
      mainBar.style.borderRadius = br >= 999 ? "999px" : br + "px";
      mainBar.style.marginTop = mt + "px";
      mainBar.style.marginBottom = "0";
      mainBar.style.marginLeft = barInset + "px";
      mainBar.style.marginRight = barInset + "px";
      mainBar.style.overflow = "visible";
    }

    if (barFill) {
      var visibleBar = progressPct > 0 ? Math.max(progressPct, 2) : 0;
      barFill.style.width = visibleBar + "%";
      barFill.classList.toggle("is-active", progressPct > 0);
      barFill.style.background = resolved.fill;
      barFill.style.borderRadius = br >= 999 ? "999px" : br + "px";
      barFill.style.transition = "width " + transMs + "ms cubic-bezier(0.4, 0, 0.2, 1), background " + transMs + "ms ease";
    }
    if (mainBar) mainBar.setAttribute("aria-valuenow", String(progressPct));
    if (mainBar) {
      mainBar.style.background = resolved.track;
      mainBar.style.transition = "background " + transMs + "ms ease";
    }
    root.setAttribute("data-seq-progress", String(progressPct));

    function applyPointStyle(el, phase) {
      if (!el) return;
      el.style.width = badgeSize + "px";
      el.style.height = badgeSize + "px";
      el.style.background = phase.badgeBackgroundColor || "#ffffff";
      el.style.color = phase.iconColor || "#000000";
      el.style.border = "none";
      el.style.boxShadow = phase.badgeShadow || "none";
      el.style.outline = "none";
      el.style.transition =
        "background " + transMs + "ms ease, color " + transMs + "ms ease, box-shadow " + transMs + "ms ease, transform 0.2s ease";
    }

    if (mainBarPoint1) {
      mainBarPoint1.style.left = tierCount > 1 ? String(tier1RatioPct) + "%" : "100%";
      mainBarPoint1.style.display = showTierIcons ? "" : "none";
      applyPointStyle(mainBarPoint1, p1);
      mainBarPoint1.classList.toggle("sce-seq-main-bar-point--locked", false);
    }
    if (mainBarPoint2) {
      mainBarPoint2.style.left = "100%";
      applyPointStyle(mainBarPoint2, p2);
      mainBarPoint2.classList.toggle("sce-seq-main-bar-point--locked", !tier2Complete);
    }
    if (mainBarPoint1Icon) {
      mainBarPoint1Icon.textContent = tierIconDisplay(tier1Icon, "%");
      mainBarPoint1Icon.style.fontSize = (p1.iconSizePx || Math.max(12, Math.round(badgeSize * 0.33))) + "px";
    }
    if (mainBarPoint2Icon) {
      mainBarPoint2Icon.textContent = tierIconDisplay(tier2Icon, "🚚");
      mainBarPoint2Icon.style.fontSize = (p2.iconSizePx || Math.max(12, Math.round(badgeSize * 0.33))) + "px";
    }

    var barCapsEl = root.querySelector(".sce-seq-bar-caps");
    if (barCapsEl) {
      barCapsEl.style.marginLeft = barInset + "px";
      barCapsEl.style.marginRight = barInset + "px";
      barCapsEl.style.marginTop = capGap + "px";
      barCapsEl.style.position = "relative";
    }
    if (cap1) {
      cap1.style.left = tierCount > 1 ? String(tier1RatioPct) + "%" : "100%";
      cap1.style.right = "";
      cap1.style.transform = "translateX(-50%)";
      cap1.style.textAlign = "center";
      cap1.style.whiteSpace = "nowrap";
      cap1.style.maxWidth = "";
    }
    if (cap2) {
      cap2.style.left = "100%";
      cap2.style.right = "";
      cap2.style.transform = "translateX(-50%)";
      cap2.style.textAlign = "center";
      cap2.style.whiteSpace = "nowrap";
      cap2.style.maxWidth = "";
    }
    if (cap1Label) {
      cap1Label.textContent = tier1LabelText || tier1Label || "Tier 1";
      cap1Label.style.color = p1.labelColor || tierHeadingColor;
      cap1Label.style.visibility = showTierLabels && showTier1Heading ? "visible" : "hidden";
    }
    if (cap1Price) {
      setStepMinAmount(cap1Price, targets.tier1Cents);
      cap1Price.style.color = p1.priceLabelColor || tierSubheadingColor;
      cap1Price.style.visibility = showTierMinimums ? "visible" : "hidden";
    }
    if (cap2Label) {
      cap2Label.textContent = tier2LabelText || tier2Label || "Tier 2";
      cap2Label.style.color = p2.labelColor || tierHeadingColor;
      cap2Label.style.visibility = showTierLabels && showTier2Heading ? "visible" : "hidden";
    }
    if (cap2Price) {
      setStepMinAmount(cap2Price, tierCount > 1 ? targets.tier2Cents : NaN);
      cap2Price.style.color = p2.priceLabelColor || tierSubheadingColor;
      cap2Price.style.visibility = showTierMinimums ? "visible" : "hidden";
    }

    if (hint) {
      var subLabel = formatMoney(subtotalCents);
      var shipLabel = formatMoney(shippingChargeCents);
      if (tierCount === 1) {
        if (tier1Complete) {
          hint.textContent = subtotalLabel + ": " + subLabel + " · " + sequentialMsg2;
        } else {
          hint.textContent =
            subtotalLabel +
            ": " +
            subLabel +
            " (" +
            estimatedShippingLabel +
            ": " +
            shipLabel +
            ") · " +
            sequentialHintZero;
        }
      } else if (tier2Complete) {
        hint.textContent =
          subtotalLabel + ": " + subLabel + " · " + sequentialMsg2;
      } else if (tier1Complete) {
        hint.textContent =
          subtotalLabel +
          ": " +
          subLabel +
          " (" +
          estimatedShippingLabel +
          ": " +
          shipLabel +
          ") · " +
          sequentialHintMid;
      } else {
        hint.textContent =
          subtotalLabel +
          ": " +
          subLabel +
          " (" +
          estimatedShippingLabel +
          ": " +
          shipLabel +
          ") · " +
          sequentialHintZero;
      }
      hint.style.display = showHint ? "" : "none";
      hint.style.color = hintColor;
    }

    if (dynamicTierMode) {
      // Hide interactive unlock buttons; this mode is automatic ("highest tier wins").
      var buttons = root.querySelectorAll(".sce-tier-unlock-btn");
      for (var i = 0; i < buttons.length; i += 1) {
        buttons[i].style.display = "none";
      }
    }
  }

  function getWidgetMountPoint(host) {
    var drawerRoot = host.closest("cart-drawer, .cart-drawer, .drawer, [id*='CartDrawer']") || host;
    var header = drawerRoot.querySelector(".drawer__header, .cart-drawer__header, .ajaxcart__header, header");
    var items = drawerRoot.querySelector(".drawer__inner, .cart-drawer__items, .ajaxcart__inner, form[action*='/cart']");

    if (header && header.parentElement) {
      return { container: header.parentElement, before: header.nextElementSibling };
    }

    if (items && items.parentElement) {
      return { container: items.parentElement, before: items };
    }

    var footer = drawerRoot.querySelector(".drawer__footer, .cart-drawer__footer, .ajaxcart__footer, .cart__footer");
    if (footer && footer.parentElement) {
      return { container: footer.parentElement, before: footer };
    }

    return { container: host, before: null };
  }

  function placeWidget(host, root) {
    if (!host || !root) return;
    var mount = getWidgetMountPoint(host);
    if (!mount || !mount.container) return;
    var region = mountingRegionForHost(host) || mount.container;
    var anchorSelector = '.sce-widget-mount[data-sce-scope="' + injectionScopeId + '"]';
    var anchor = region.querySelector(anchorSelector);
    if (!anchor) {
      anchor = document.createElement("div");
      anchor.className = "sce-widget-mount";
      anchor.setAttribute("data-sce-scope", injectionScopeId);
      anchor.setAttribute("data-sce-injected", "1");
      if (mount.before) {
        mount.container.insertBefore(anchor, mount.before);
      } else {
        mount.container.appendChild(anchor);
      }
    }
    if (root.parentElement !== anchor) {
      anchor.appendChild(root);
    }
  }

function ensureWidgetCoreStyles(root, isSequential) {
  if (!root) return;
  root.style.display = "block";
  root.style.visibility = "visible";
  root.style.opacity = "1";
  root.style.width = "100%";
  root.style.boxSizing = "border-box";
  root.style.position = "relative";
  if (!root.style.zIndex) root.style.zIndex = "2";

  var bar = root.querySelector(".sce-free-shipping-widget__bar");
  if (bar) {
    bar.style.display = "block";
    if (isSequential && bar.classList.contains("sce-seq-main-bar")) {
      bar.style.overflow = "visible";
    } else {
      bar.style.width = "100%";
      bar.style.overflow = "hidden";
      bar.style.borderRadius = "999px";
      bar.style.height = isSequential ? "10px" : "8px";
      if (!bar.style.background) bar.style.background = "#e5e7eb";
    }
  }

  var fill = root.querySelector(
    isSequential
      ? ".sce-seq-main-bar-fill"
      : ".sce-free-shipping-widget__bar-fill",
  );
  if (fill) {
    fill.style.display = "block";
    fill.style.height = "100%";
    if (!fill.style.minWidth) fill.style.minWidth = "0px";
    if (!fill.style.background) fill.style.background = "#111827";
  }

  if (isSequential) {
    var stack = root.querySelector(".sce-seq-bar-stack");
    if (stack) {
      stack.style.display = "block";
      stack.style.position = "relative";
      stack.style.width = "100%";
    }
  }
}

  function renderWidget(host, cart) {
    if (!host) return;

    var subtotal = getCartSubtotalCents(cart);
    var freeThresholdCents = firstFreeTierMinCents();
    var remaining = Math.max(0, freeThresholdCents - subtotal);
    var matchedTier = resolveTier(subtotal);
    var reached = !!matchedTier && matchedTier.shippingCents === 0;
    var hasChargeTier = !!matchedTier && matchedTier.shippingCents > 0;
    var effectiveShippingCents = matchedTier ? matchedTier.shippingCents : shippingChargeCents;
    var progress =
      freeThresholdCents > 0
        ? Math.min(100, Math.round((subtotal / freeThresholdCents) * 100))
        : 0;

    var root = host.classList.contains("sce-free-shipping-widget")
      ? host
      : host.querySelector(".sce-free-shipping-widget");
    if (!root) {
      root = findInjectedWidgetRootInHostRegion(host);
    }
    if (!root) {
      root = document.createElement("div");
      root.className = "sce-free-shipping-widget";
      root.innerHTML =
        '<div class="sce-free-shipping-widget__title"></div>' +
        '<div class="sce-free-shipping-widget__message"></div>' +
        '<div class="sce-free-shipping-widget__bar"><div class="sce-free-shipping-widget__bar-fill"></div></div>' +
        '<div class="sce-free-shipping-widget__milestones">' +
          '<span class="sce-milestone" data-step="25">25%</span>' +
          '<span class="sce-milestone" data-step="50">50%</span>' +
          '<span class="sce-milestone" data-step="100">Free</span>' +
        '</div>' +
        '<div class="sce-free-shipping-widget__hint"></div>';
      root.setAttribute("data-sce-scope", injectionScopeId);
      root.setAttribute("data-sce-injected", "1");
    }
    placeWidget(host, root);
    ensureWidgetCoreStyles(root, false);
    applyWidgetColors(root);
    root.classList.toggle("sce-free-shipping-widget--sce-primary", !allowMultipleWidgetHosts);

    var title = root.querySelector(".sce-free-shipping-widget__title");
    var message = root.querySelector(".sce-free-shipping-widget__message");
    var barFill = root.querySelector(".sce-free-shipping-widget__bar-fill");
    var hint = root.querySelector(".sce-free-shipping-widget__hint");
    var milestones = root.querySelectorAll(".sce-milestone");

    var thresholdLabel = formatMoney(freeThresholdCents);
    if (title) title.textContent = titleText;
    if (message) {
      var tierMessage = matchedTier && matchedTier.message ? matchedTier.message : "";
      message.textContent = reached
        ? (tierMessage || reachedText)
        : hasChargeTier
          ? (tierMessage || chargedText).split("[shipping_amount]").join(formatMoney(effectiveShippingCents))
        : progressText
            .split("[remaining_amount]")
            .join(formatMoney(remaining))
            .split("[threshold]")
            .join(thresholdLabel);
    }
    if (barFill) {
      var visibleProgress = progress > 0 ? Math.max(progress, 3) : 0;
      barFill.style.width = visibleProgress + "%";
      barFill.classList.toggle("is-active", progress > 0);
      barFill.setAttribute("aria-valuenow", String(progress));
    }
    milestones.forEach(function (milestone) {
      var step = Number(milestone.getAttribute("data-step") || 0);
      milestone.classList.toggle("is-active", progress >= step);
    });

    if (hint) {
      if (reached) {
        hint.textContent = effectiveShippingCents > 0
          ? "Shipping saved: " + formatMoney(effectiveShippingCents)
          : "";
      } else if (hasChargeTier) {
        hint.textContent = "Current subtotal: " + formatMoney(subtotal) + " (Shipping: " + formatMoney(effectiveShippingCents) + ")";
      } else {
        var hintText = "Current subtotal: " + formatMoney(subtotal) + " / " + formatMoney(freeThresholdCents);
        if (effectiveShippingCents > 0) {
          hintText += " (Estimated shipping: " + formatMoney(effectiveShippingCents) + ")";
        }
        hint.textContent = hintText;
      }
    }
  }


  function fetchCart() {
    return fetch("/cart.js", { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Cart fetch failed");
      return r.json();
    });
  }

  function postCartAccessLog(cart) {
    if (!logEnabled || !logUrl || !cart) return;

    var subtotal = getCartSubtotalCents(cart);
    var sig = String(cart.item_count || 0) + "_" + String(subtotal);
    if (sig === lastPostedCartSig) return;
    lastPostedCartSig = sig;

    window.clearTimeout(logPostTimer);
    logPostTimer = window.setTimeout(function () {
      fetch(logUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_count: cart.item_count,
          items_subtotal_price: subtotal,
          currency: cart.currency,
          pathname: window.location.pathname,
          source: "smart_cart_extension",
        }),
      }).catch(function () {
        /* ignore log failures */
      });
    }, 400);
  }

  /** With pinned Shipping Progress block: also mount in cart page + cart drawer by default. */
  function getDefaultCartPageHostForPinned() {
    if (!/\/cart($|\?)/i.test(window.location.pathname || "")) return null;
    return (
      document.querySelector("form[action*='/cart']") ||
      document.querySelector(".cart__blocks") ||
      document.querySelector(".cart__contents") ||
      document.querySelector(".template-cart .cart") ||
      null
    );
  }

  function getDefaultCartDrawerHostForPinned() {
    var inner = document.querySelector(
      "cart-drawer .drawer__inner, .cart-drawer .drawer__inner, [id*='CartDrawer'] .drawer__inner, #CartDrawer .drawer__inner",
    );
    if (inner) return inner;
    return (
      document.querySelector("cart-drawer, [id*='CartDrawer'], #CartDrawer, .cart-drawer") || null
    );
  }

  function getHosts() {
    if (pinnedMountSelector) {
      var combined = [];
      try {
        var pinEl = document.querySelector(pinnedMountSelector);
        if (pinEl) combined.push(pinEl);
      } catch (_) {
        /* invalid selector */
      }
      var cartPageHost = getDefaultCartPageHostForPinned();
      if (cartPageHost) combined.push(cartPageHost);
      var drawerHost = getDefaultCartDrawerHostForPinned();
      if (drawerHost) combined.push(drawerHost);
      combined = uniqueElements(combined);
      return keepDeepestHosts(combined);
    }
    var hosts = [];
    selectorTargets.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        hosts.push(el);
      });
    });
    hosts = uniqueElements(hosts);

    // Fallbacks: if selectors miss, still render in common storefront containers.
    if (!hosts.length) {
      var productHost = document.querySelector(
        ".product__info-container, .product-form, form[action*='/cart/add'], .product__info-wrapper",
      );
      if (productHost) hosts.push(productHost);
    }
    if (!hosts.length) {
      var cartHost = document.querySelector(
        "form[action*='/cart'], .cart__blocks, cart-drawer, [id*='CartDrawer'], .cart-drawer__content, .drawer__inner",
      );
      if (cartHost) hosts.push(cartHost);
    }
    if (!hosts.length) {
      var mainHost = document.querySelector("main, #MainContent, .main-content");
      if (mainHost) hosts.push(mainHost);
    }

    return uniqueElements(hosts);
  }

  function getNameHosts() {
    var hosts = [];
    nameTargetSelectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        hosts.push(el);
      });
    });

    hosts = uniqueElements(hosts);

    if (!hosts.length) {
      var cartHeading = Array.prototype.find.call(
        document.querySelectorAll("h1, h2, h3"),
        function (el) {
          return /your cart|cart/i.test((el.textContent || "").trim());
        }
      );
      if (cartHeading && cartHeading.parentElement) {
        hosts.push(cartHeading.parentElement);
      }
    }

    if (!hosts.length && /\/cart($|\?)/.test(window.location.pathname)) {
      var cartPageFallback = document.querySelector("main, #MainContent, .main-content, .template-cart");
      if (cartPageFallback) {
        hosts.push(cartPageFallback);
      }
    }

    if (!hosts.length) {
      var drawerFallback = document.querySelector(
        "[id*='CartDrawer'], [class*='cart-drawer'], [class*='drawer']"
      );
      if (drawerFallback) {
        hosts.push(drawerFallback);
      }
    }

    return uniqueElements(hosts);
  }

  function isCartRelatedElement(el) {
    if (!(el instanceof Element)) return false;
    if (el.closest(".sce-free-shipping-widget")) return false;

    // If merchant adds configured target classes/sections dynamically, refresh immediately.
    if (elementTouchesAnyTarget(el, selectorTargets)) return true;

    if (
      el.matches("form[action*='/cart'], cart-drawer, [id*='CartDrawer'], [class*='cart-drawer'], [class*='drawer']") ||
      el.querySelector("form[action*='/cart'], cart-drawer, [id*='CartDrawer'], [class*='cart-drawer'], [class*='drawer']")
    ) {
      return true;
    }

    var combined = ((el.textContent || "") + " " + (el.className || "") + " " + (el.id || "")).toLowerCase();
    return combined.indexOf("cart") !== -1;
  }

  function renderAllHostsWithCart(cart) {
    if (!cart) return;
    if (selectorTargets.length === 0) return;
    var prevApplying = isApplyingChanges;
    isApplyingChanges = true;
    try {
      var hosts = preferSceBlockHosts(getHosts());
      if (!allowMultipleWidgetHosts) {
        hosts = dedupeWidgetHostsAcrossThemes(hosts);
        hosts = pickSingleWidgetHost(hosts);
      }
      if (hosts && hosts.length) {
        removeOrphanInjectedWidgets(hosts);
        dedupeInjectedWidgetsInOpenCart();
        hosts.forEach(function (host) {
          if (sequentialMode) {
            renderSequentialWidget(host, cart);
          } else {
            renderWidget(host, cart);
          }
        });
      }
    } finally {
      isApplyingChanges = prevApplying;
    }
  }

  function update() {
    isApplyingChanges = true;
    isApplyingChanges = false;

    var needWidget = selectorTargets.length > 0;
    var needLog = logEnabled && !!logUrl;

    if (!needWidget && !needLog) return;

    if (lastKnownCart && needWidget) {
      renderAllHostsWithCart(lastKnownCart);
    }

    fetchCart()
      .then(function (cart) {
        lastKnownCart = cart;
        if (needLog) postCartAccessLog(cart);

        if (dynamicTierMode) {
          var subtotal = getCartSubtotalCents(cart);
          var cur = cart && cart.currency ? String(cart.currency).trim() : "";
          var cartSig = String(cart && cart.item_count || 0) + "_" + String(subtotal || 0) + "_" + cur;
          var now = Date.now();
          var shouldSyncDynamic =
            cartSig !== lastDynamicCartSig || now - lastDynamicSyncAt > 10000;
          if (!shouldSyncDynamic) {
            renderAllHostsWithCart(cart);
            return;
          }
          lastDynamicCartSig = cartSig;
          lastDynamicSyncAt = now;
          refreshDynamicTiersWithCart(cart).then(function () {
            renderAllHostsWithCart(cart);
          });
        } else {
          renderAllHostsWithCart(cart);
        }
      })
      .catch(function () {
        if (lastKnownCart && needWidget) {
          renderAllHostsWithCart(lastKnownCart);
        }
      });
  }

  function debouncedUpdate() {
    window.clearTimeout(updateTimeout);
    updateTimeout = window.setTimeout(update, 250);
  }

  document.addEventListener("DOMContentLoaded", update);
  document.addEventListener("cart:updated", debouncedUpdate);
  document.addEventListener("ajaxProduct:added", debouncedUpdate);
  document.addEventListener("change", function (e) {
    var target = e.target;
    if (target && target.closest('form[action*="/cart"]')) {
      debouncedUpdate();
    }
  });
  document.addEventListener("click", function (e) {
    var target = e.target;
    if (target && target.closest('form[action*="/cart"], cart-drawer, [id*="CartDrawer"], [class*="cart-drawer"]')) {
      debouncedUpdate();
    }
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) debouncedUpdate();
  });
  window.addEventListener("focus", debouncedUpdate);

  var observer = new MutationObserver(function (mutations) {
    if (isApplyingChanges) return;

    var now = Date.now();

    var widgetWasRemoved = false;
    if (lastKnownCart) {
      for (var mi = 0; mi < mutations.length; mi++) {
        var mut = mutations[mi];
        for (var ri = 0; ri < mut.removedNodes.length; ri++) {
          var removed = mut.removedNodes[ri];
          if (!(removed instanceof Element)) continue;
          try {
            if (
              removed.matches('[data-sce-scope="' + injectionScopeId + '"]') ||
              removed.querySelector('[data-sce-scope="' + injectionScopeId + '"]')
            ) {
              widgetWasRemoved = true;
              break;
            }
          } catch (_) {}
        }
        if (widgetWasRemoved) break;
      }
    }

    if (widgetWasRemoved) {
      renderAllHostsWithCart(lastKnownCart);
      debouncedUpdate();
      return;
    }

    if (now - lastUpdateAt < 500) return;

    var shouldUpdate = mutations.some(function (mutation) {
      if (mutation.type === "characterData") {
        var p = mutation.target && mutation.target.parentElement;
        if (p && isCartRelatedElement(p)) return true;
      }
      if (isCartRelatedElement(mutation.target)) return true;
      for (var i = 0; i < mutation.addedNodes.length; i += 1) {
        if (isCartRelatedElement(mutation.addedNodes[i])) return true;
      }
      return false;
    });

    if (!shouldUpdate) return;
    lastUpdateAt = now;
    debouncedUpdate();
  });
  observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });

  // Safety sync for themes that update cart text without reliable events.
  pollIntervalId = window.setInterval(function () {
    var cartOpen = document.querySelector("cart-drawer[open], .cart-drawer.is-open, #CartDrawer:not([aria-hidden='true']), form[action*='/cart']");
    if (cartOpen) debouncedUpdate();
  }, 3000);

  globalInstances[instanceKey] = {
    teardown: function () {
      try {
        observer.disconnect();
      } catch (_) {}
      try {
        window.clearTimeout(updateTimeout);
        window.clearTimeout(logPostTimer);
      } catch (_) {}
      try {
        if (pollIntervalId) window.clearInterval(pollIntervalId);
      } catch (_) {}
      try {
        document
          .querySelectorAll('[data-sce-scope="' + injectionScopeId + '"]')
          .forEach(function (node) {
            node.remove();
          });
      } catch (_) {}
    },
  };
})();
