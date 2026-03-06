'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Code, Globe, Smartphone, Box, Key, ExternalLink, Copy, CheckCircle, Layers, Zap } from 'lucide-react';

const sections = [
  { id: 'overview', label: 'Overview', icon: Layers },
  { id: 'iframe', label: 'Iframe Embed', icon: Globe },
  { id: 'sdk', label: 'SDK', icon: Code },
  { id: 'api', label: 'Partner API', icon: Key },
  { id: 'products', label: 'Product Mapping', icon: Box },
  { id: 'mobile', label: 'Mobile & AR', icon: Smartphone },
  { id: 'urls', label: 'URL Reference', icon: Zap },
];

export default function DocsPage() {
  const [active, setActive] = useState('overview');
  const [copied, setCopied] = useState('');

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  const CodeBlock = ({ id, code, label }: { id: string; code: string; label?: string }) => (
    <div className="relative">
      {label && <p className="text-xs font-medium text-surface-500 mb-1.5">{label}</p>}
      <div className="bg-surface-900 rounded-lg p-4 overflow-x-auto">
        <pre className="text-xs text-surface-200 whitespace-pre-wrap font-mono">{code}</pre>
        <button
          onClick={() => copy(code, id)}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors"
        >
          {copied === id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Header title="Integration Docs" subtitle="How to integrate AR-core-7 into your website or app" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active === s.id ? 'bg-brand-50 text-brand-700' : 'text-surface-600 hover:bg-surface-50'
                }`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 card p-6 space-y-6">
            {/* ---- Overview ---- */}
            {active === 'overview' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-surface-900">Integration Overview</h3>
                <p className="text-sm text-surface-600 leading-relaxed">
                  AR-core-7 provides three levels of integration for embedding AR experiences into your website or app.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-surface-200">
                    <Globe className="w-6 h-6 text-brand-600 mb-2" />
                    <h4 className="text-sm font-semibold text-surface-900">No-Code</h4>
                    <p className="text-xs text-surface-500 mt-1">Copy an iframe embed or direct URL. Paste into your site. Done.</p>
                  </div>
                  <div className="p-4 rounded-lg border border-surface-200">
                    <Code className="w-6 h-6 text-brand-600 mb-2" />
                    <h4 className="text-sm font-semibold text-surface-900">SDK</h4>
                    <p className="text-xs text-surface-500 mt-1">Include a tiny JS SDK. Mount viewers or launch AR with one function call.</p>
                  </div>
                  <div className="p-4 rounded-lg border border-surface-200">
                    <Key className="w-6 h-6 text-brand-600 mb-2" />
                    <h4 className="text-sm font-semibold text-surface-900">API</h4>
                    <p className="text-xs text-surface-500 mt-1">Use the Partner API for full control. Fetch products, resolve launches, build custom UIs.</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-brand-50 border border-brand-100">
                  <h4 className="text-sm font-semibold text-brand-800 mb-1">White-Label by Default</h4>
                  <p className="text-xs text-brand-700">All embed and public routes use your company branding. You can hide all AR-core-7 branding from Settings &rarr; White-Label.</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-surface-900">Supported Business Use Cases</h4>
                  <ul className="text-sm text-surface-600 space-y-1.5 list-disc list-inside">
                    <li><strong>Restaurant menus</strong> &mdash; Tap a menu item, see the dish in AR</li>
                    <li><strong>Ecommerce PDPs</strong> &mdash; Embed a 3D viewer, launch AR from product page</li>
                    <li><strong>QR on packaging</strong> &mdash; QR code links to direct launch URL</li>
                    <li><strong>Custom catalog apps</strong> &mdash; Fetch products via API, render your own UI</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ---- Iframe ---- */}
            {active === 'iframe' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-surface-900">Iframe Embed</h3>
                <p className="text-sm text-surface-600">The simplest integration. Paste this into any HTML page.</p>

                <CodeBlock
                  id="iframe"
                  label="Basic Embed"
                  code={`<iframe\n  src="${base}/embed/{experience-slug}"\n  style="width:100%;height:600px;border:0;"\n  allow="camera; xr-spatial-tracking"\n  allowfullscreen\n></iframe>`}
                />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-surface-900">Features</h4>
                  <ul className="text-sm text-surface-600 space-y-1 list-disc list-inside">
                    <li>No AR-core-7 UI chrome &mdash; pure 3D viewer</li>
                    <li>Mobile-first with touch controls</li>
                    <li>AR launch button appears on supported devices</li>
                    <li>Inherits company brand colors</li>
                    <li>Loading skeleton while model downloads</li>
                  </ul>
                </div>

                <CodeBlock
                  id="iframe-direct"
                  label="Direct AR Launch Link (for buttons)"
                  code={`<a href="${base}/launch/{experience-slug}">\n  View in AR\n</a>`}
                />

                <CodeBlock
                  id="iframe-product"
                  label="Product-Based AR Link"
                  code={`<a href="${base}/product/{product-slug}/ar">\n  See this product in AR\n</a>`}
                />
              </div>
            )}

            {/* ---- SDK ---- */}
            {active === 'sdk' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-surface-900">JavaScript SDK</h3>
                <p className="text-sm text-surface-600">A tiny (&lt;3KB) framework-free SDK for embedding viewers and launching AR.</p>

                <CodeBlock
                  id="sdk-script"
                  label="1. Include the SDK"
                  code={`<script src="${base}/sdk/arcore7-sdk.js"></script>`}
                />

                <CodeBlock
                  id="sdk-mount"
                  label="2. Mount an embedded viewer"
                  code={`<div id="ar-viewer" style="height:500px"></div>\n<script>\n  ARCore7.mountViewer({\n    target: "#ar-viewer",\n    experienceSlug: "your-experience-slug",\n    apiBase: "${base}",\n    style: { height: "500px", borderRadius: "12px" },\n    onLoad: function() { console.log("Viewer loaded!"); }\n  });\n</script>`}
                />

                <CodeBlock
                  id="sdk-launch-exp"
                  label="3. Launch AR by experience"
                  code={`<button onclick="ARCore7.launchExperience({ experienceSlug: 'your-slug' })">\n  View in AR\n</button>`}
                />

                <CodeBlock
                  id="sdk-launch-prod"
                  label="4. Launch AR by product"
                  code={`<button onclick="ARCore7.launchProduct({ productSlug: 'your-product' })">\n  See this in your space\n</button>`}
                />

                <CodeBlock
                  id="sdk-fetch"
                  label="5. Fetch data (Promise-based)"
                  code={`ARCore7.getExperience({ experienceSlug: "your-slug" })\n  .then(function(data) {\n    console.log(data.urls.viewer);\n    console.log(data.urls.embed);\n    console.log(data.assets.model);\n  });`}
                />

                <div className="p-4 rounded-lg bg-surface-50 border border-surface-200">
                  <h4 className="text-sm font-semibold text-surface-900 mb-2">SDK Methods</h4>
                  <div className="space-y-2 text-xs">
                    <div><code className="font-mono text-brand-700">ARCore7.mountViewer(opts)</code> &mdash; Embed 3D viewer into target element</div>
                    <div><code className="font-mono text-brand-700">ARCore7.launchExperience(opts)</code> &mdash; Open AR by experience slug</div>
                    <div><code className="font-mono text-brand-700">ARCore7.launchProduct(opts)</code> &mdash; Open AR by product slug</div>
                    <div><code className="font-mono text-brand-700">ARCore7.getExperience(opts)</code> &mdash; Fetch experience data (async)</div>
                    <div><code className="font-mono text-brand-700">ARCore7.getProduct(opts)</code> &mdash; Fetch product data (async)</div>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Partner API ---- */}
            {active === 'api' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-surface-900">Partner API (v1)</h3>
                <p className="text-sm text-surface-600">Authenticated REST API for full control over products, experiences, and AR launches.</p>

                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <h4 className="text-sm font-semibold text-amber-800 mb-1">Authentication</h4>
                  <p className="text-xs text-amber-700 mb-2">All v1 endpoints require an API key. Create one in Settings &rarr; API Keys.</p>
                  <code className="text-xs bg-white px-2 py-1 rounded border border-amber-200 font-mono">Authorization: Bearer ak_live_...</code>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-surface-900">Endpoints</h4>

                  {[
                    { method: 'GET', path: '/api/v1/products', desc: 'List all products (paginated)' },
                    { method: 'GET', path: '/api/v1/products/:id', desc: 'Get product by ID' },
                    { method: 'GET', path: '/api/v1/products/by-slug/:slug', desc: 'Get product by slug' },
                    { method: 'GET', path: '/api/v1/products/by-external-id/:externalId', desc: 'Get product by external ID mapping' },
                    { method: 'GET', path: '/api/v1/products/:id/assets', desc: 'List product assets' },
                    { method: 'GET', path: '/api/v1/products/:id/experiences', desc: 'List published experiences for product' },
                    { method: 'GET', path: '/api/v1/experiences/:id', desc: 'Get experience by ID' },
                    { method: 'GET', path: '/api/v1/experiences/by-slug/:slug', desc: 'Get experience by slug' },
                    { method: 'GET', path: '/api/v1/launch/product/:slug', desc: 'Resolve product to AR launch data' },
                    { method: 'GET', path: '/api/v1/launch/experience/:slug', desc: 'Resolve experience to AR launch data' },
                  ].map((ep, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-surface-100 last:border-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 flex-shrink-0 mt-0.5">{ep.method}</span>
                      <div>
                        <code className="text-xs font-mono text-surface-800">{ep.path}</code>
                        <p className="text-xs text-surface-500 mt-0.5">{ep.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <CodeBlock
                  id="api-example"
                  label="Example: Fetch product and launch AR"
                  code={`// Fetch product by external ID (e.g. your menu system ID)\nconst res = await fetch("${base}/api/v1/products/by-external-id/pepperoni_pizza_large", {\n  headers: { "Authorization": "Bearer ak_live_..." }\n});\nconst { data } = await res.json();\n\n// Get AR launch URL\nconst arUrl = data.experiences[0]?.urls.launch;\nif (arUrl) window.open(arUrl);`}
                />

                <div className="p-4 rounded-lg bg-surface-50 border border-surface-200">
                  <h4 className="text-sm font-semibold text-surface-900 mb-2">Rate Limits</h4>
                  <p className="text-xs text-surface-600">120 requests per minute per API key. Rate-limited responses return HTTP 429 with <code>Retry-After</code> header.</p>
                </div>
              </div>
            )}

            {/* ---- Product Mapping ---- */}
            {active === 'products' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-surface-900">Product External Mapping</h3>
                <p className="text-sm text-surface-600">
                  Map your own product IDs to AR-core-7 products so you can launch AR using your existing catalog identifiers.
                </p>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-surface-900">How It Works</h4>
                  <ol className="text-sm text-surface-600 space-y-2 list-decimal list-inside">
                    <li>Go to a product in the dashboard and click <strong>Edit</strong></li>
                    <li>Set the <strong>External ID</strong> to your system&apos;s product identifier (e.g. <code className="text-xs bg-surface-100 px-1 rounded">pepperoni_pizza_large</code>)</li>
                    <li>Optionally set <strong>External Source</strong> (e.g. <code className="text-xs bg-surface-100 px-1 rounded">shopify</code>, <code className="text-xs bg-surface-100 px-1 rounded">menu_system</code>)</li>
                    <li>Call the API with your external ID to get AR data</li>
                  </ol>
                </div>

                <CodeBlock
                  id="mapping-api"
                  label="API lookup by external ID"
                  code={`GET /api/v1/products/by-external-id/pepperoni_pizza_large\nAuthorization: Bearer ak_live_...\n\n// Response includes:\n// - product info, assets, viewer URLs\n// - published experiences with embed/launch URLs`}
                />

                <div className="p-4 rounded-lg bg-brand-50 border border-brand-100">
                  <h4 className="text-sm font-semibold text-brand-800 mb-1">Use Case: Restaurant Menu</h4>
                  <p className="text-xs text-brand-700">
                    Your menu website has item ID <code>pepperoni_pizza_large</code>. Map it to AR-core-7 product.
                    When a customer taps the menu item, call the API with your item ID, get the AR launch URL, and open it.
                    The customer sees the pizza in AR &mdash; inside your experience, not ours.
                  </p>
                </div>
              </div>
            )}

            {/* ---- Mobile & AR ---- */}
            {active === 'mobile' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-surface-900">Mobile & AR Caveats</h3>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-surface-200">
                    <h4 className="text-sm font-semibold text-surface-900 mb-2">iOS Safari (iPhone/iPad)</h4>
                    <ul className="text-xs text-surface-600 space-y-1 list-disc list-inside">
                      <li>AR uses Apple Quick Look &mdash; opens native AR viewer</li>
                      <li>USDZ model required for best iOS AR experience</li>
                      <li>Camera permission prompt appears on AR launch</li>
                      <li>Works from embedded iframes with <code>allow=&quot;camera; xr-spatial-tracking&quot;</code></li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg border border-surface-200">
                    <h4 className="text-sm font-semibold text-surface-900 mb-2">Android Chrome</h4>
                    <ul className="text-xs text-surface-600 space-y-1 list-disc list-inside">
                      <li>AR uses Google Scene Viewer or WebXR</li>
                      <li>GLB model required</li>
                      <li>ARCore-compatible device needed for AR mode</li>
                      <li>3D viewing works on all Android Chrome browsers</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg border border-surface-200">
                    <h4 className="text-sm font-semibold text-surface-900 mb-2">Desktop Browsers</h4>
                    <ul className="text-xs text-surface-600 space-y-1 list-disc list-inside">
                      <li>3D viewer works on all modern browsers</li>
                      <li>AR not available &mdash; viewer shows 3D-only mode</li>
                      <li>Mouse drag to rotate, scroll to zoom</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <h4 className="text-sm font-semibold text-amber-800 mb-1">Testing Recommendation</h4>
                  <p className="text-xs text-amber-700">
                    Always test on a real mobile device. Use Chrome DevTools mobile emulation for layout testing,
                    but AR features require actual device hardware. Test on both iOS Safari and Android Chrome.
                  </p>
                </div>
              </div>
            )}

            {/* ---- URL Reference ---- */}
            {active === 'urls' && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-surface-900">URL Reference</h3>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-surface-900">Public Routes (no auth required)</h4>
                  {[
                    { path: '/ar/{experience-slug}', desc: 'Full AR viewer page with branding' },
                    { path: '/embed/{experience-slug}', desc: 'Clean embed viewer (no chrome, iframe-ready)' },
                    { path: '/launch/{experience-slug}', desc: 'Direct AR launch (attempts activateAR)' },
                    { path: '/product/{product-slug}/ar', desc: 'AR via product slug (resolves to experience)' },
                    { path: '/qr/{experience-slug}', desc: 'QR code page for the experience' },
                    { path: '/viewer/{company-slug}/{product-slug}', desc: 'Product viewer page' },
                  ].map((route, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-surface-100 last:border-0">
                      <code className="text-xs font-mono text-brand-700 flex-shrink-0">{route.path}</code>
                      <p className="text-xs text-surface-500">{route.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-surface-900">Public API (no auth required)</h4>
                  {[
                    { path: '/api/public/experiences/{slug}', desc: 'Published experience data + URLs' },
                    { path: '/api/public/products/{slug}', desc: 'Product data + asset URLs + experiences' },
                  ].map((route, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-surface-100 last:border-0">
                      <code className="text-xs font-mono text-brand-700 flex-shrink-0">{route.path}</code>
                      <p className="text-xs text-surface-500">{route.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-surface-900">SDK</h4>
                  <div className="flex items-start gap-3 py-2">
                    <code className="text-xs font-mono text-brand-700 flex-shrink-0">/sdk/arcore7-sdk.js</code>
                    <p className="text-xs text-surface-500">Client-side JS SDK (&lt;3KB)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
