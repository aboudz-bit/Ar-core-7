'use client';

import { useState } from 'react';
import Script from 'next/script';
import { Eye, Smartphone, ExternalLink, UtensilsCrossed, Beef, Coffee, Pizza, MapPin, ChevronRight } from 'lucide-react';

interface ProductCard {
  name: string;
  slug: string;
  description: string;
  price: string;
  color: string;
}

interface Restaurant {
  name: string;
  type: string;
  location: string;
  description: string;
  icon: typeof UtensilsCrossed;
  gradient: string;
  accentColor: string;
  products: ProductCard[];
}

const restaurants: Restaurant[] = [
  {
    name: 'Pizza Demo Restaurant',
    type: 'Italian Pizzeria',
    location: 'Demo Location',
    description: 'Classic Italian pizzeria with AR-enabled menu.',
    icon: Pizza,
    gradient: 'from-red-500 to-orange-500',
    accentColor: '#dc2626',
    products: [
      {
        name: 'Margherita Pizza',
        slug: 'margherita-pizza',
        description: 'Classic Italian margherita with fresh mozzarella, San Marzano tomatoes, and basil on a thin, crispy crust.',
        price: '$14.99',
        color: '#16a34a',
      },
      {
        name: 'Pepperoni Pizza',
        slug: 'pepperoni-pizza',
        description: 'Loaded pepperoni pizza with extra cheese, spicy pepperoni, and our signature tomato sauce.',
        price: '$16.99',
        color: '#dc2626',
      },
    ],
  },
  {
    name: 'Nozomi Al Khobar',
    type: 'Japanese Fine Dining',
    location: 'Al Khobar, Saudi Arabia',
    description: 'Luxury Japanese dining experience.',
    icon: UtensilsCrossed,
    gradient: 'from-slate-800 to-amber-700',
    accentColor: '#c9a96e',
    products: [
      {
        name: 'Wagyu Sushi',
        slug: 'nz-wagyu-sushi',
        description: 'Premium A5 wagyu beef sushi with truffle soy glaze, served on warm shari rice with gold leaf garnish.',
        price: 'SAR 180',
        color: '#92400e',
      },
      {
        name: 'Salmon Nigiri',
        slug: 'nz-salmon-nigiri',
        description: 'Fresh Norwegian salmon nigiri with citrus ponzu, micro herbs, and edible flowers on hand-pressed rice.',
        price: 'SAR 120',
        color: '#ea580c',
      },
      {
        name: 'Matcha Dessert',
        slug: 'nz-matcha-dessert',
        description: 'Ceremonial-grade matcha mousse with white chocolate ganache, azuki bean compote, and matcha tuile.',
        price: 'SAR 85',
        color: '#16a34a',
      },
    ],
  },
  {
    name: 'Steak House Al Khobar Premium',
    type: 'Steakhouse',
    location: 'Al Khobar, Saudi Arabia',
    description: 'Premium steak and grill restaurant.',
    icon: Beef,
    gradient: 'from-red-900 to-red-700',
    accentColor: '#c0392b',
    products: [
      {
        name: 'Wagyu Steak',
        slug: 'sh-wagyu-steak',
        description: 'Dry-aged A5 Japanese wagyu ribeye, charcoal-grilled to perfection with truffle butter and seasonal vegetables.',
        price: 'SAR 450',
        color: '#7f1d1d',
      },
      {
        name: 'Tomahawk Steak',
        slug: 'sh-tomahawk-steak',
        description: '1.2kg bone-in tomahawk ribeye, wood-fired and served with roasted garlic, bone marrow, and peppercorn sauce.',
        price: 'SAR 380',
        color: '#991b1b',
      },
      {
        name: 'Truffle Burger',
        slug: 'sh-truffle-burger',
        description: 'Wagyu beef patty with black truffle aioli, aged gruyere, caramelized onions on a brioche bun.',
        price: 'SAR 95',
        color: '#78350f',
      },
    ],
  },
  {
    name: 'Brioche Doree Cafe',
    type: 'French Cafe / Dessert',
    location: 'Al Khobar, Saudi Arabia',
    description: 'Elegant French cafe with pastries and coffee.',
    icon: Coffee,
    gradient: 'from-amber-700 to-yellow-600',
    accentColor: '#d4a843',
    products: [
      {
        name: 'Croissant',
        slug: 'bd-croissant',
        description: 'Handmade French butter croissant with 72-hour fermented dough, baked golden and flaky every morning.',
        price: 'SAR 22',
        color: '#b45309',
      },
      {
        name: 'Chocolate Cake',
        slug: 'bd-chocolate-cake',
        description: 'Rich Valrhona dark chocolate fondant with molten center, served with vanilla bean ice cream and cocoa dust.',
        price: 'SAR 55',
        color: '#451a03',
      },
      {
        name: 'Latte',
        slug: 'bd-latte',
        description: 'Single-origin Ethiopian espresso with silky steamed milk and delicate latte art, served in artisan ceramic.',
        price: 'SAR 28',
        color: '#92400e',
      },
    ],
  },
];

export default function DemoPage() {
  const [launching, setLaunching] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);

  const handleLaunchAR = (slug: string) => {
    setLaunching(slug);
    const g = globalThis as Record<string, unknown>;
    if (typeof window !== 'undefined' && g.ARCore) {
      (g.ARCore as { launch: (s: string) => void }).launch(slug);
    }
    setTimeout(() => setLaunching(null), 2000);
  };

  const activeRestaurant = selectedRestaurant
    ? restaurants.find((r) => r.name === selectedRestaurant)
    : null;

  return (
    <>
      <Script src="/sdk/arcore.js" strategy="beforeInteractive" />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900" data-testid="text-demo-title">
                  {activeRestaurant ? activeRestaurant.name : 'AR-Core-7 Demo'}
                </h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Powered by AR-core-7</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeRestaurant && (
                <button
                  onClick={() => setSelectedRestaurant(null)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  data-testid="button-back-restaurants"
                >
                  All Restaurants
                </button>
              )}
              <a
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                data-testid="link-dashboard"
              >
                Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </header>

        {!activeRestaurant ? (
          <>
            <section className="max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium mb-4">
                <Smartphone className="w-3 h-3" />
                AR-Enabled Restaurants
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3" data-testid="text-hero-title">Premium AR Dining</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Experience luxury dining in augmented reality. Browse our partner restaurants and view their signature dishes in AR before you order.
              </p>
            </section>

            <section className="max-w-6xl mx-auto px-4 pb-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {restaurants.map((restaurant) => {
                  const IconComponent = restaurant.icon;
                  return (
                    <button
                      key={restaurant.name}
                      onClick={() => setSelectedRestaurant(restaurant.name)}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all text-left group"
                      data-testid={`card-restaurant-${restaurant.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className={`h-32 bg-gradient-to-r ${restaurant.gradient} flex items-center justify-between px-8`}>
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{restaurant.name}</h3>
                          <p className="text-white/70 text-sm">{restaurant.type}</p>
                        </div>
                        <IconComponent className="w-12 h-12 text-white/30" />
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                          <MapPin className="w-3 h-3" />
                          {restaurant.location}
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{restaurant.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{restaurant.products.length} AR dishes</span>
                          <span className="text-sm font-medium text-indigo-600 group-hover:text-indigo-800 flex items-center gap-1">
                            View Menu <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="max-w-6xl mx-auto px-4 pt-8 pb-6">
              <div className={`rounded-2xl bg-gradient-to-r ${activeRestaurant.gradient} p-8 text-white mb-8`}>
                <div className="flex items-center gap-1.5 text-white/60 text-xs mb-2">
                  <MapPin className="w-3 h-3" />
                  {activeRestaurant.location}
                </div>
                <h2 className="text-3xl font-bold mb-2" data-testid="text-restaurant-name">{activeRestaurant.name}</h2>
                <p className="text-white/80">{activeRestaurant.type} &mdash; {activeRestaurant.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {activeRestaurant.products.map((product) => {
                  const RestIcon = activeRestaurant.icon;
                  return (
                  <div
                    key={product.slug}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                    data-testid={`card-product-${product.slug}`}
                  >
                    <div className="relative h-44 flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${product.color}11, ${product.color}22)` }}>
                      <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${product.color}22, ${product.color}44)` }}>
                        <RestIcon className="w-14 h-14" style={{ color: product.color }} />
                      </div>
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-gray-900">
                        {product.price}
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-1.5" data-testid={`text-product-${product.slug}`}>{product.name}</h3>
                      <p className="text-sm text-gray-500 mb-4 leading-relaxed line-clamp-2">{product.description}</p>

                      <button
                        onClick={() => handleLaunchAR(product.slug)}
                        disabled={launching === product.slug}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r ${activeRestaurant.gradient} text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-70 shadow-sm hover:shadow-md`}
                        data-testid={`button-ar-${product.slug}`}
                      >
                        {launching === product.slug ? (
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
                  );
                })}
              </div>
            </section>
          </>
        )}

        <section className="bg-white border-t border-gray-100 py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h3 className="text-xl font-bold text-gray-900 text-center mb-8">How It Works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Choose Restaurant', desc: 'Browse our premium partner restaurants' },
                { step: '2', title: 'Tap "View in AR"', desc: 'Select a dish to preview in AR' },
                { step: '3', title: 'Allow Camera', desc: 'Grant camera access when prompted' },
                { step: '4', title: 'Place on Table', desc: 'See the dish on your real table' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-sm">
                    {item.step}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-100 py-6">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-gray-400">
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
