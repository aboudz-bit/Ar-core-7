/**
 * ARCore SDK — Lightweight AR launcher
 * Usage: ARCore.launch('margherita-pizza')
 */
(function () {
  'use strict';

  var ARCore = {
    _baseUrl: '',

    init: function (options) {
      this._baseUrl = (options && options.baseUrl) || window.location.origin;
    },

    launch: function (slug) {
      var self = this;
      var base = this._baseUrl || window.location.origin;
      var apiUrl = base + '/api/public/product/' + encodeURIComponent(slug);

      // Show loading overlay
      var overlay = this._createOverlay();
      overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#fff;font-family:system-ui,sans-serif"><div style="width:48px;height:48px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:arcore-spin 0.8s linear infinite"></div><p style="margin-top:16px;font-size:14px">Loading AR experience...</p></div>';
      document.body.appendChild(overlay);

      // Add spinner keyframe
      if (!document.getElementById('arcore-style')) {
        var style = document.createElement('style');
        style.id = 'arcore-style';
        style.textContent = '@keyframes arcore-spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
      }

      fetch(apiUrl)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.model) {
            overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#fff;font-family:system-ui,sans-serif"><p style="font-size:18px;font-weight:600">Model not found</p><p style="margin-top:8px;font-size:14px;opacity:0.7">No 3D model available for this product.</p><button onclick="this.closest(\'[data-arcore-overlay]\').remove()" style="margin-top:20px;padding:10px 24px;background:#fff;color:#000;border:none;border-radius:8px;font-size:14px;cursor:pointer">Close</button></div>';
            return;
          }
          self._openViewer(overlay, data);
        })
        .catch(function (err) {
          console.error('ARCore SDK error:', err);
          overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#fff;font-family:system-ui,sans-serif"><p style="font-size:18px;font-weight:600">Failed to load</p><p style="margin-top:8px;font-size:14px;opacity:0.7">' + err.message + '</p><button onclick="this.closest(\'[data-arcore-overlay]\').remove()" style="margin-top:20px;padding:10px 24px;background:#fff;color:#000;border:none;border-radius:8px;font-size:14px;cursor:pointer">Close</button></div>';
        });
    },

    _createOverlay: function () {
      // Remove any existing overlay
      var existing = document.querySelector('[data-arcore-overlay]');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.setAttribute('data-arcore-overlay', 'true');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.95);';
      return overlay;
    },

    _openViewer: function (overlay, productData) {
      var base = this._baseUrl || window.location.origin;

      overlay.innerHTML = '';
      overlay.style.background = '#000';

      // Close button
      var closeBtn = document.createElement('button');
      closeBtn.textContent = '\u2715';
      closeBtn.style.cssText = 'position:absolute;top:16px;right:16px;z-index:100001;width:44px;height:44px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
      closeBtn.onclick = function () { overlay.remove(); };
      overlay.appendChild(closeBtn);

      // Product info bar
      var infoBar = document.createElement('div');
      infoBar.style.cssText = 'position:absolute;bottom:0;left:0;right:0;z-index:100001;padding:20px;background:linear-gradient(transparent,rgba(0,0,0,0.8));color:#fff;font-family:system-ui,sans-serif;';
      infoBar.innerHTML = '<p style="font-size:18px;font-weight:700;margin:0">' + (productData.name || '') + '</p>' +
        '<p style="font-size:13px;opacity:0.7;margin:4px 0 0">' + (productData.company || '') + '</p>';
      overlay.appendChild(infoBar);

      // model-viewer element (using Google model-viewer)
      var viewer = document.createElement('model-viewer');
      viewer.setAttribute('src', productData.model);
      if (productData.poster) viewer.setAttribute('poster', productData.poster);
      viewer.setAttribute('ar', '');
      viewer.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
      viewer.setAttribute('camera-controls', '');
      viewer.setAttribute('auto-rotate', '');
      viewer.setAttribute('shadow-intensity', '1');
      viewer.setAttribute('shadow-softness', '1');
      viewer.setAttribute('environment-image', 'neutral');
      viewer.setAttribute('exposure', '1');
      viewer.setAttribute('ar-placement', 'floor');
      viewer.style.cssText = 'width:100%;height:100%;background:#111;';
      overlay.appendChild(viewer);

      // Load model-viewer script if needed
      if (!customElements.get('model-viewer')) {
        var script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
        document.head.appendChild(script);
      }

      // Track analytics
      try {
        fetch(base + '/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: 'demo',
            eventType: 'ar_launch',
            eventData: { source: 'sdk', product: productData.slug },
          }),
        });
      } catch (e) { /* ignore */ }
    },
  };

  // Auto-init with current origin
  ARCore.init({});

  // Expose globally
  window.ARCore = ARCore;
})();
