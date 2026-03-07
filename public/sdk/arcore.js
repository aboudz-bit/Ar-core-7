/**
 * ARCore SDK — Lightweight AR launcher with 3 visualization modes:
 * A) Full Surface AR — when product has MODEL_GLB/MODEL_USDZ
 * B) Image-only AR fallback — camera + product image overlay
 * C) 3D Viewer fallback — standard model-viewer without camera
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

      var overlay = this._createOverlay();
      overlay.innerHTML = this._loadingHTML();
      document.body.appendChild(overlay);
      this._ensureStyles();

      fetch(apiUrl)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.error) {
            self._showError(overlay, 'Product not found', 'This product is not available.');
            return;
          }

          if (data.hasModel && (data.model || data.modelUsdz)) {
            self._openModelViewer(overlay, data);
          } else if (data.hasImage && data.image) {
            self._openImageAR(overlay, data);
          } else {
            self._showError(overlay, 'No AR asset available', 'This product has no 3D model or image for AR preview.');
          }
        })
        .catch(function (err) {
          console.error('ARCore SDK error:', err);
          self._showError(overlay, 'Failed to load', err.message);
        });
    },

    _createOverlay: function () {
      var existing = document.querySelector('[data-arcore-overlay]');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.setAttribute('data-arcore-overlay', 'true');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.95);';
      return overlay;
    },

    _ensureStyles: function () {
      if (document.getElementById('arcore-style')) return;
      var style = document.createElement('style');
      style.id = 'arcore-style';
      style.textContent = [
        '@keyframes arcore-spin{to{transform:rotate(360deg)}}',
        '@keyframes arcore-pulse{0%,100%{opacity:1}50%{opacity:0.5}}',
        '.arcore-btn{padding:10px 20px;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:system-ui,sans-serif;transition:transform 0.15s,opacity 0.15s;}',
        '.arcore-btn:active{transform:scale(0.96);opacity:0.8;}',
        '.arcore-close{position:absolute;top:16px;right:16px;z-index:100002;width:44px;height:44px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);}',
        '.arcore-info{position:absolute;bottom:0;left:0;right:0;z-index:100002;padding:20px;background:linear-gradient(transparent,rgba(0,0,0,0.85));color:#fff;font-family:system-ui,sans-serif;}',
        '.arcore-mode-badge{position:absolute;top:16px;left:16px;z-index:100002;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;font-family:system-ui,sans-serif;backdrop-filter:blur(8px);}',
      ].join('\n');
      document.head.appendChild(style);
    },

    _loadingHTML: function () {
      return '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#fff;font-family:system-ui,sans-serif">' +
        '<div style="width:48px;height:48px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:arcore-spin 0.8s linear infinite"></div>' +
        '<p style="margin-top:16px;font-size:14px">Loading AR experience...</p></div>';
    },

    _showError: function (overlay, title, message) {
      overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:#fff;font-family:system-ui,sans-serif;padding:24px;text-align:center">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        '<p style="font-size:18px;font-weight:600;margin:16px 0 0">' + title + '</p>' +
        '<p style="margin-top:8px;font-size:14px;opacity:0.7;max-width:300px">' + message + '</p>' +
        '<button class="arcore-btn" onclick="this.closest(\'[data-arcore-overlay]\').remove()" style="margin-top:24px;background:#fff;color:#000">Close</button></div>';
    },

    _addCloseBtn: function (overlay) {
      var btn = document.createElement('button');
      btn.className = 'arcore-close';
      btn.textContent = '\u2715';
      btn.onclick = function () {
        var video = overlay.querySelector('video');
        if (video && video.srcObject) {
          video.srcObject.getTracks().forEach(function (t) { t.stop(); });
        }
        overlay.remove();
      };
      overlay.appendChild(btn);
      return btn;
    },

    _addInfoBar: function (overlay, data) {
      var bar = document.createElement('div');
      bar.className = 'arcore-info';
      bar.innerHTML = '<p style="font-size:18px;font-weight:700;margin:0">' + (data.name || '') + '</p>' +
        '<p style="font-size:13px;opacity:0.7;margin:4px 0 0">' + (data.company || '') + '</p>';
      overlay.appendChild(bar);
      return bar;
    },

    /** Mode A: Full Surface AR with model-viewer */
    _openModelViewer: function (overlay, data) {
      overlay.innerHTML = '';
      overlay.style.background = '#000';

      this._addCloseBtn(overlay);

      var badge = document.createElement('div');
      badge.className = 'arcore-mode-badge';
      badge.style.cssText += 'background:rgba(16,185,129,0.2);color:#6ee7b7;border:1px solid rgba(16,185,129,0.3);';
      badge.textContent = '3D Model';
      overlay.appendChild(badge);

      this._addInfoBar(overlay, data);

      var viewer = document.createElement('model-viewer');
      if (data.model) {
        viewer.setAttribute('src', data.model);
      }
      if (data.modelUsdz) {
        viewer.setAttribute('ios-src', data.modelUsdz);
        if (!data.model) viewer.setAttribute('src', data.modelUsdz);
      }
      if (data.poster) viewer.setAttribute('poster', data.poster);
      viewer.setAttribute('ar', '');
      viewer.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
      viewer.setAttribute('camera-controls', '');
      viewer.setAttribute('touch-action', 'pan-y');
      viewer.setAttribute('auto-rotate', '');
      viewer.setAttribute('shadow-intensity', '1');
      viewer.setAttribute('shadow-softness', '1');
      viewer.setAttribute('environment-image', 'neutral');
      viewer.setAttribute('exposure', '1.0');
      viewer.setAttribute('ar-placement', 'floor');
      viewer.setAttribute('loading', 'eager');
      viewer.setAttribute('reveal', 'auto');
      viewer.style.cssText = 'width:100%;height:100%;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);';

      var arBtn = document.createElement('button');
      arBtn.setAttribute('slot', 'ar-button');
      arBtn.className = 'arcore-btn';
      arBtn.style.cssText += 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;display:flex;align-items:center;gap:8px;padding:12px 24px;box-shadow:0 4px 20px rgba(16,185,129,0.4);';
      arBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> View in Your Space';
      viewer.appendChild(arBtn);

      overlay.appendChild(viewer);

      if (!customElements.get('model-viewer')) {
        var script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
        document.head.appendChild(script);
      }
    },

    /** Mode B: Image-only AR fallback with camera */
    _openImageAR: function (overlay, data) {
      var self = this;
      overlay.innerHTML = '';
      overlay.style.background = '#000';

      var closeBtn = self._addCloseBtn(overlay);

      var badge = document.createElement('div');
      badge.className = 'arcore-mode-badge';
      badge.style.cssText += 'background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);';
      badge.textContent = 'Image AR Preview';
      overlay.appendChild(badge);

      var isIframe = false;
      try { isIframe = window.self !== window.top; } catch (e) { isIframe = true; }

      if (isIframe) {
        self._openImageARNoCamera(overlay, data);
        return;
      }

      var cameraMsg = document.createElement('div');
      cameraMsg.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;font-family:system-ui,sans-serif;z-index:1;';
      cameraMsg.innerHTML = '<div style="width:48px;height:48px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:arcore-spin 0.8s linear infinite"></div>' +
        '<p style="margin-top:16px;font-size:14px">Requesting camera access...</p>';
      overlay.appendChild(cameraMsg);

      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } })
        .then(function (stream) {
          cameraMsg.remove();

          var video = document.createElement('video');
          video.setAttribute('playsinline', '');
          video.setAttribute('autoplay', '');
          video.muted = true;
          video.srcObject = stream;
          video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;';
          overlay.insertBefore(video, overlay.firstChild);
          video.play().catch(function () {});

          closeBtn.onclick = function () {
            stream.getTracks().forEach(function (t) { t.stop(); });
            overlay.remove();
          };

          self._renderImageCard(overlay, data);
        })
        .catch(function (err) {
          console.warn('Camera access denied or unavailable:', err.message);
          cameraMsg.remove();
          self._openImageARNoCamera(overlay, data);
        });
    },

    _renderImageCard: function (overlay, data) {
      var cardScale = 1;
      var cardY = 0;

      var container = document.createElement('div');
      container.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;pointer-events:none;';

      var card = document.createElement('div');
      card.style.cssText = 'pointer-events:auto;background:rgba(255,255,255,0.95);border-radius:16px;padding:8px;box-shadow:0 8px 40px rgba(0,0,0,0.4);max-width:260px;width:70vw;transition:transform 0.1s;backdrop-filter:blur(4px);';
      card.style.transform = 'scale(' + cardScale + ') translateY(' + cardY + 'px)';

      var img = document.createElement('img');
      img.src = data.image;
      img.alt = data.name;
      img.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;display:block;';
      card.appendChild(img);

      var label = document.createElement('div');
      label.style.cssText = 'padding:10px 4px 6px;text-align:center;font-family:system-ui,sans-serif;';
      label.innerHTML = '<p style="font-size:15px;font-weight:700;margin:0;color:#1a1a1a">' + data.name + '</p>' +
        '<p style="font-size:12px;color:#666;margin:4px 0 0">' + (data.company || '') + '</p>';
      card.appendChild(label);

      container.appendChild(card);
      overlay.appendChild(container);

      var controls = document.createElement('div');
      controls.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:100002;display:flex;gap:10px;';

      var minusBtn = document.createElement('button');
      minusBtn.className = 'arcore-btn';
      minusBtn.style.cssText += 'background:rgba(255,255,255,0.15);color:#fff;width:44px;height:44px;padding:0;display:flex;align-items:center;justify-content:center;font-size:20px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);';
      minusBtn.textContent = '\u2212';
      minusBtn.onclick = function () {
        cardScale = Math.max(0.4, cardScale - 0.15);
        card.style.transform = 'scale(' + cardScale + ') translateY(' + cardY + 'px)';
      };

      var plusBtn = document.createElement('button');
      plusBtn.className = 'arcore-btn';
      plusBtn.style.cssText += 'background:rgba(255,255,255,0.15);color:#fff;width:44px;height:44px;padding:0;display:flex;align-items:center;justify-content:center;font-size:20px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);';
      plusBtn.textContent = '+';
      plusBtn.onclick = function () {
        cardScale = Math.min(2.5, cardScale + 0.15);
        card.style.transform = 'scale(' + cardScale + ') translateY(' + cardY + 'px)';
      };

      var resetBtn = document.createElement('button');
      resetBtn.className = 'arcore-btn';
      resetBtn.style.cssText += 'background:rgba(255,255,255,0.15);color:#fff;padding:0 16px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);font-size:13px;';
      resetBtn.textContent = 'Reset';
      resetBtn.onclick = function () {
        cardScale = 1;
        cardY = 0;
        card.style.transform = 'scale(1) translateY(0px)';
      };

      controls.appendChild(minusBtn);
      controls.appendChild(plusBtn);
      controls.appendChild(resetBtn);
      overlay.appendChild(controls);

      var startY = 0;
      var dragging = false;
      card.addEventListener('touchstart', function (e) {
        dragging = true;
        startY = e.touches[0].clientY - cardY;
        e.preventDefault();
      }, { passive: false });
      card.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        cardY = e.touches[0].clientY - startY;
        card.style.transform = 'scale(' + cardScale + ') translateY(' + cardY + 'px)';
        e.preventDefault();
      }, { passive: false });
      card.addEventListener('touchend', function () { dragging = false; });

      card.addEventListener('mousedown', function (e) {
        dragging = true;
        startY = e.clientY - cardY;
        e.preventDefault();
      });
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        cardY = e.clientY - startY;
        card.style.transform = 'scale(' + cardScale + ') translateY(' + cardY + 'px)';
      });
      document.addEventListener('mouseup', function () { dragging = false; });
    },

    _openImageARNoCamera: function (overlay, data) {
      var noCamMsg = document.createElement('div');
      noCamMsg.style.cssText = 'position:absolute;inset:0;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);display:flex;align-items:center;justify-content:center;z-index:0;';
      overlay.insertBefore(noCamMsg, overlay.firstChild);

      var hint = document.createElement('div');
      hint.style.cssText = 'position:absolute;top:60px;left:50%;transform:translateX(-50%);z-index:100002;text-align:center;font-family:system-ui,sans-serif;color:#fff;max-width:300px;padding:12px 20px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;backdrop-filter:blur(8px);';
      hint.innerHTML = '<p style="font-size:13px;margin:0;opacity:0.9">Camera not available in this view.</p>' +
        '<p style="font-size:12px;margin:6px 0 0;opacity:0.6">Open in a browser tab for camera-based AR.</p>';
      overlay.appendChild(hint);

      this._renderImageCard(overlay, data);
    },

    /**
     * Launch a face/body try-on experience by experience slug.
     * @param {string|Object} options — slug string or { slug, target? }
     *   target: CSS selector or DOM element to embed the try-on iframe into.
     *           If omitted, opens as fullscreen overlay.
     */
    launchTryOn: function (options) {
      var self = this;
      var slug = (typeof options === 'string') ? options : options.slug;
      var target = (typeof options === 'object' && options.target) || null;
      var base = this._baseUrl || window.location.origin;
      var apiUrl = base + '/api/public/tryon/' + encodeURIComponent(slug);

      // If target element specified, open in iframe inside that element
      if (target) {
        var container = typeof target === 'string' ? document.querySelector(target) : target;
        if (!container) {
          console.error('ARCore: target element not found:', target);
          return;
        }
        var iframe = document.createElement('iframe');
        iframe.src = base + '/tryon/' + encodeURIComponent(slug);
        iframe.style.cssText = 'width:100%;height:100%;border:0;';
        iframe.setAttribute('allow', 'camera; microphone');
        iframe.setAttribute('allowfullscreen', '');
        container.innerHTML = '';
        container.appendChild(iframe);
        return;
      }

      // Otherwise open as fullscreen overlay
      var overlay = this._createOverlay();
      overlay.innerHTML = this._loadingHTML();
      document.body.appendChild(overlay);
      this._ensureStyles();

      fetch(apiUrl)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.success) {
            self._showError(overlay, 'Try-on not available', data.error || 'Experience not found.');
            return;
          }

          overlay.innerHTML = '';
          overlay.style.background = '#000';

          var closeBtn = self._addCloseBtn(overlay);

          var badge = document.createElement('div');
          badge.className = 'arcore-mode-badge';
          badge.style.cssText += 'background:rgba(168,85,247,0.2);color:#c4b5fd;border:1px solid rgba(168,85,247,0.3);';
          badge.textContent = data.data.type === 'FACE_TRYON' ? 'Face Try-On' : 'Body Try-On';
          overlay.appendChild(badge);

          // Embed the try-on page in an iframe within the overlay
          var tryonIframe = document.createElement('iframe');
          tryonIframe.src = data.data.urls.tryon;
          tryonIframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;z-index:1;';
          tryonIframe.setAttribute('allow', 'camera; microphone');
          tryonIframe.setAttribute('allowfullscreen', '');
          overlay.appendChild(tryonIframe);

          // Re-append close button above iframe
          closeBtn.style.zIndex = '100002';

          self._addInfoBar(overlay, {
            name: data.data.product ? data.data.product.title : data.data.name,
            company: data.data.company ? data.data.company.name : '',
          });
        })
        .catch(function (err) {
          console.error('ARCore SDK try-on error:', err);
          self._showError(overlay, 'Failed to load try-on', err.message);
        });
    },
  };

  ARCore.init({});
  window.ARCore = ARCore;
})();
