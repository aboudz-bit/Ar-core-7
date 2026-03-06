'use client';

import { useState } from 'react';
import Script from 'next/script';
import { Pizza, Eye, Smartphone, ExternalLink } from 'lucide-react';

interface ProductCard {
  name: string;
  slug: string;
  description: string;
  price: string;
  image: string;
  color: string;
}

const pizzas: ProductCard[] = [
  {
    name: 'Margherita Pizza',
    slug: 'margherita-pizza',
    description: 'Classic Italian margherita with fresh mozzarella, San Marzano tomatoes, and basil on a thin, crispy crust.',
    price: '$14.99',
    image: '/api/demo/pizza-image?type=margherita',
    color: '#16a34a',
  },
  {
    name: 'Pepperoni Pizza',
    slug: 'pepperoni-pizza',
    description: 'Loaded pepperoni pizza with extra cheese, spicy pepperoni, and our signature tomato sauce.',
    price: '$16.99',
    image: '/api/demo/pizza-image?type=pepperoni',
    color: '#dc2626',
  },
];

export default function DemoPage() {
  const [launching, setLaunching] = useState<string | null>(null);

  const handleLaunchAR = (slug: string) => {
    setLaunching(slug);
    const g = globalThis as Record<string, unknown>;
    if (typeof window !== 'undefined' && g.ARCore) {
      (g.ARCore as { launch: (s: string) => void }).launch(slug);
    }
    setTimeout(() => setLaunching(null), 2000);
  };

  return (
    <>
      <Script src="/sdk/arcore.js" strategy="beforeInteractive" />

      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-red-50">
        {/* Header */}
        <header className="bg-white border-b border-orange-100 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Pizza className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Pizza Demo Restaurant</h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Powered by AR-core-7</p>
              </div>
            </div>
            <a
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium mb-4">
            <Smartphone className="w-3 h-3" />
            AR-Enabled Menu
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Pizza Menu Demo</h2>
          <p className="text-lg text-gray-500 max-w-lg mx-auto">
            See our pizzas in augmented reality before you order. Tap &quot;View in AR&quot; to place a pizza right on your table.
          </p>
        </section>

        {/* Product Cards */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pizzas.map((pizza) => (
              <div
                key={pizza.slug}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Product Image */}
                <div className="relative h-56 bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center overflow-hidden">
                  <div className="w-40 h-40 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pizza.color}22, ${pizza.color}44)` }}>
                    <Pizza className="w-20 h-20" style={{ color: pizza.color }} />
                  </div>
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-gray-900">
                    {pizza.price}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{pizza.name}</h3>
                  <p className="text-sm text-gray-500 mb-5 leading-relaxed">{pizza.description}</p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleLaunchAR(pizza.slug)}
                      disabled={launching === pizza.slug}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold text-sm hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-70 shadow-sm hover:shadow-md"
                    >
                      {launching === pizza.slug ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          View in AR
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white border-t border-gray-100 py-12">
          <div className="max-w-5xl mx-auto px-4">
            <h3 className="text-xl font-bold text-gray-900 text-center mb-8">How It Works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Browse Menu', desc: 'Explore our AR-enabled menu' },
                { step: '2', title: 'Tap "View in AR"', desc: 'Select a product to preview' },
                { step: '3', title: 'Allow Camera', desc: 'Grant camera access when prompted' },
                { step: '4', title: 'Place on Table', desc: 'See the pizza on your real table' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-sm">
                    {item.step}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-6">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-xs text-gray-400">
            <span>AR-core-7 Platform Demo</span>
            <div className="flex gap-4">
              <a href="/login" className="hover:text-gray-600">Login</a>
              <a href="/dashboard" className="hover:text-gray-600">Dashboard</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
