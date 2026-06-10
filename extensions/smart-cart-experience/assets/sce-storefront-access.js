/**
 * Shared storefront subscription guard (trial expired = no theme UI).
 */
(function () {
  var root = window;
  root.SCE = root.SCE || {};

  function readInlineStorefrontConfig() {
    var el = document.getElementById("sce-inline-storefront-config");
    if (!el) return null;
    var raw = String(el.textContent || "").trim();
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function isStorefrontDisabled(payload) {
    return Boolean(
      payload && typeof payload === "object" && payload.ok === true && payload.storefrontEnabled === false,
    );
  }

  function shutdownStorefrontUi() {
    try {
      document.querySelectorAll(".sce-announcement-bar").forEach(function (node) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      });
      document.body.classList.remove("sce-announcement-bar--sticky-pad");
    } catch (_a) {
      /* ignore */
    }

    try {
      document.querySelectorAll(".sce-popup-overlay, .sce-popup-root, [data-sce-popup-root]").forEach(function (node) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      });
    } catch (_p) {
      /* ignore */
    }

    try {
      var progressInstances = root.__sceShippingProgressInstances;
      if (progressInstances && typeof progressInstances === "object") {
        Object.keys(progressInstances).forEach(function (key) {
          var inst = progressInstances[key];
          if (inst && typeof inst.teardown === "function") {
            try {
              inst.teardown();
            } catch (_t) {
              /* ignore */
            }
          }
          delete progressInstances[key];
        });
      }
      document.querySelectorAll(".sce-free-shipping-widget").forEach(function (node) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      });
      document.querySelectorAll(".sce-cart-name-row").forEach(function (node) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      });
    } catch (_f) {
      /* ignore */
    }

    try {
      document.querySelectorAll(".sce-additional-ui-block").forEach(function (node) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      });
    } catch (_u) {
      /* ignore */
    }
  }

  function guardStorefrontFromPayload(payload) {
    if (!isStorefrontDisabled(payload)) return false;
    shutdownStorefrontUi();
    root.__sceStorefrontDisabled = true;
    return true;
  }

  root.SCE.readInlineStorefrontConfig = readInlineStorefrontConfig;
  root.SCE.isStorefrontDisabled = isStorefrontDisabled;
  root.SCE.shutdownStorefrontUi = shutdownStorefrontUi;
  root.SCE.guardStorefrontFromPayload = guardStorefrontFromPayload;

  var inline = readInlineStorefrontConfig();
  if (guardStorefrontFromPayload(inline)) {
    root.__sceStorefrontDisabled = true;
  }
})();
