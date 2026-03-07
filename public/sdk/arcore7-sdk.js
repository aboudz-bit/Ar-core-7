/**
 * AR-core-7 Embed SDK v1.0
 * Lightweight client-side SDK for embedding AR experiences.
 *
 * Usage:
 *   <script src="https://your-domain.com/sdk/arcore7-sdk.js"></script>
 *   <script>
 *     ARCore7.mountViewer({
 *       target: "#ar-root",
 *       experienceSlug: "lx-sneaker-3d",
 *       apiBase: "https://your-domain.com"
 *     });
 *   </script>
 */
(function (root) {
  'use strict';

  var SDK_VERSION = '1.0.0';

  // ---- Helpers ----

  function resolveBase(opts) {
    if (opts && opts.apiBase) return opts.apiBase.replace(/\/+$/, '');
    // Infer from script tag src
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('arcore7-sdk') !== -1) {
        var url = new URL(src);
        return url.origin;
      }
    }
    return window.location.origin;
  }

  function getTarget(selector) {
    if (typeof selector === 'string') return document.querySelector(selector);
    if (selector instanceof HTMLElement) return selector;
    return null;
  }

  function createIframe(src, style) {
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.style.width = (style && style.width) || '100%';
    iframe.style.height = (style && style.height) || '600px';
    iframe.style.border = '0';
    iframe.style.borderRadius = (style && style.borderRadius) || '0';
    iframe.setAttribute('allow', 'camera; xr-spatial-tracking');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    return iframe;
  }

  function showError(container, message) {
    if (!container) {
      console.error('[ARCore7] ' + message);
      return;
    }
    container.innerHTML = '<div style="' +
      'display:flex;align-items:center;justify-content:center;' +
      'min-height:200px;background:#f8f9fa;border-radius:12px;' +
      'color:#868e96;font-family:system-ui,sans-serif;font-size:14px;' +
      'text-align:center;padding:24px;">' +
      '<div><p style="margin:0 0 4px;font-weight:600;">AR-core-7</p>' +
      '<p style="margin:0;">' + message + '</p></div></div>';
  }

  // ---- SDK Methods ----

  var ARCore7 = {
    version: SDK_VERSION,

    /**
     * Mount an embedded 3D/AR viewer into a target element.
     *
     * @param {Object} opts
     * @param {string|HTMLElement} opts.target - CSS selector or DOM element
     * @param {string} opts.experienceSlug - Experience slug to embed
     * @param {string} [opts.apiBase] - Base URL (auto-detected if omitted)
     * @param {Object} [opts.style] - { width, height, borderRadius }
     * @param {Function} [opts.onLoad] - Called when iframe loads
     * @param {Function} [opts.onError] - Called on error
     */
    mountViewer: function (opts) {
      if (!opts || !opts.experienceSlug) {
        var msg = 'experienceSlug is required';
        if (opts && opts.onError) opts.onError(new Error(msg));
        console.error('[ARCore7] ' + msg);
        return;
      }

      var container = getTarget(opts.target);
      if (!container) {
        var msg2 = 'Target element not found: ' + opts.target;
        if (opts.onError) opts.onError(new Error(msg2));
        console.error('[ARCore7] ' + msg2);
        return;
      }

      var base = resolveBase(opts);
      var src = base + '/embed/' + encodeURIComponent(opts.experienceSlug);
      var iframe = createIframe(src, opts.style);

      iframe.onload = function () {
        if (opts.onLoad) opts.onLoad(iframe);
      };

      iframe.onerror = function () {
        showError(container, 'Failed to load AR experience.');
        if (opts.onError) opts.onError(new Error('iframe load failed'));
      };

      // Clear container and insert iframe
      container.innerHTML = '';
      container.appendChild(iframe);

      return iframe;
    },

    /**
     * Launch AR experience by experience slug.
     * Opens in a new tab/window on desktop, same tab on mobile.
     *
     * @param {Object} opts
     * @param {string} opts.experienceSlug - Experience slug
     * @param {string} [opts.apiBase] - Base URL
     * @param {boolean} [opts.newTab=false] - Force new tab
     */
    launchExperience: function (opts) {
      if (!opts || !opts.experienceSlug) {
        console.error('[ARCore7] experienceSlug is required');
        return;
      }

      var base = resolveBase(opts);
      var url = base + '/launch/' + encodeURIComponent(opts.experienceSlug);

      if (opts.newTab || !isMobile()) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    },

    /**
     * Launch AR by product slug.
     * Opens the product AR route.
     *
     * @param {Object} opts
     * @param {string} opts.productSlug - Product slug
     * @param {string} [opts.apiBase] - Base URL
     * @param {boolean} [opts.newTab=false] - Force new tab
     */
    launchProduct: function (opts) {
      if (!opts || !opts.productSlug) {
        console.error('[ARCore7] productSlug is required');
        return;
      }

      var base = resolveBase(opts);
      var url = base + '/product/' + encodeURIComponent(opts.productSlug) + '/ar';

      if (opts.newTab || !isMobile()) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    },

    /**
     * Fetch experience data from the public API.
     *
     * @param {Object} opts
     * @param {string} opts.experienceSlug - Experience slug
     * @param {string} [opts.apiBase] - Base URL
     * @returns {Promise<Object>} Experience data
     */
    getExperience: function (opts) {
      if (!opts || !opts.experienceSlug) {
        return Promise.reject(new Error('experienceSlug is required'));
      }

      var base = resolveBase(opts);
      var url = base + '/api/public/experiences/' + encodeURIComponent(opts.experienceSlug);

      return fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.success) throw new Error(data.error || 'Failed to fetch experience');
          return data.data;
        });
    },

    /**
     * Launch a face try-on experience by experience slug.
     *
     * @param {Object} opts
     * @param {string} opts.experienceSlug - Experience slug
     * @param {string} [opts.apiBase] - Base URL
     * @param {boolean} [opts.newTab=false] - Force new tab
     */
    launchTryOn: function (opts) {
      if (!opts || !opts.experienceSlug) {
        console.error('[ARCore7] experienceSlug is required');
        return;
      }

      var base = resolveBase(opts);
      var url = base + '/tryon/' + encodeURIComponent(opts.experienceSlug);

      if (opts.newTab || !isMobile()) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    },

    /**
     * Launch a body tracking experience by experience slug.
     *
     * @param {Object} opts
     * @param {string} opts.experienceSlug - Experience slug
     * @param {string} [opts.apiBase] - Base URL
     * @param {boolean} [opts.newTab=false] - Force new tab
     */
    launchBodyTracking: function (opts) {
      if (!opts || !opts.experienceSlug) {
        console.error('[ARCore7] experienceSlug is required');
        return;
      }

      var base = resolveBase(opts);
      var url = base + '/body/' + encodeURIComponent(opts.experienceSlug);

      if (opts.newTab || !isMobile()) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    },

    /**
     * Launch a photo-based virtual try-on (clothing) experience.
     *
     * @param {Object} opts
     * @param {string} opts.experienceSlug - Experience slug
     * @param {string} [opts.apiBase] - Base URL
     * @param {boolean} [opts.newTab=true] - Force new tab (default true since it has upload flow)
     */
    launchVirtualFit: function (opts) {
      if (!opts || !opts.experienceSlug) {
        console.error('[ARCore7] experienceSlug is required');
        return;
      }

      var base = resolveBase(opts);
      var url = base + '/virtual-fit/' + encodeURIComponent(opts.experienceSlug);

      if (opts.newTab !== false) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    },

    /**
     * Fetch product data from the public API.
     *
     * @param {Object} opts
     * @param {string} opts.productSlug - Product slug
     * @param {string} [opts.apiBase] - Base URL
     * @returns {Promise<Object>} Product data
     */
    getProduct: function (opts) {
      if (!opts || !opts.productSlug) {
        return Promise.reject(new Error('productSlug is required'));
      }

      var base = resolveBase(opts);
      var url = base + '/api/public/products/' + encodeURIComponent(opts.productSlug);

      return fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.success) throw new Error(data.error || 'Failed to fetch product');
          return data.data;
        });
    }
  };

  // ---- Utilities ----

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  // ---- Export ----

  root.ARCore7 = ARCore7;

  // Also support module environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ARCore7;
  }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
