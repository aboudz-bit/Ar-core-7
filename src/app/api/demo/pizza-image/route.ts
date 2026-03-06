import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') || 'margherita';

  const colors = type === 'pepperoni'
    ? { crust: '#D4A574', sauce: '#C0392B', topping: '#8B2500', cheese: '#F5DEB3' }
    : { crust: '#D4A574', sauce: '#C0392B', topping: '#228B22', cheese: '#FFFDD0' };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%">
      <stop offset="0%" style="stop-color:#FFF5E6"/>
      <stop offset="100%" style="stop-color:#FFE0B2"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)" rx="24"/>
  <circle cx="200" cy="200" r="140" fill="${colors.crust}" stroke="#C4956A" stroke-width="3"/>
  <circle cx="200" cy="200" r="125" fill="${colors.sauce}"/>
  <circle cx="200" cy="200" r="120" fill="${colors.cheese}" opacity="0.85"/>
  ${type === 'pepperoni' ? `
  <circle cx="160" cy="150" r="16" fill="${colors.topping}" opacity="0.9"/>
  <circle cx="220" cy="140" r="14" fill="${colors.topping}" opacity="0.85"/>
  <circle cx="250" cy="190" r="15" fill="${colors.topping}" opacity="0.9"/>
  <circle cx="230" cy="250" r="16" fill="${colors.topping}" opacity="0.85"/>
  <circle cx="170" cy="240" r="14" fill="${colors.topping}" opacity="0.9"/>
  <circle cx="140" cy="195" r="15" fill="${colors.topping}" opacity="0.85"/>
  <circle cx="200" cy="200" r="13" fill="${colors.topping}" opacity="0.9"/>
  <circle cx="185" cy="170" r="12" fill="${colors.topping}" opacity="0.8"/>
  ` : `
  <ellipse cx="170" cy="160" rx="12" ry="6" fill="${colors.topping}" transform="rotate(-20 170 160)"/>
  <ellipse cx="230" cy="170" rx="10" ry="5" fill="${colors.topping}" transform="rotate(15 230 170)"/>
  <ellipse cx="190" cy="230" rx="11" ry="5" fill="${colors.topping}" transform="rotate(-30 190 230)"/>
  <ellipse cx="240" cy="220" rx="12" ry="6" fill="${colors.topping}" transform="rotate(25 240 220)"/>
  <ellipse cx="160" cy="210" rx="10" ry="5" fill="${colors.topping}" transform="rotate(10 160 210)"/>
  <ellipse cx="210" cy="190" rx="9" ry="4" fill="${colors.topping}" transform="rotate(-15 210 190)"/>
  <circle cx="180" cy="185" r="5" fill="#FFFFFF" opacity="0.7"/>
  <circle cx="220" cy="200" r="6" fill="#FFFFFF" opacity="0.65"/>
  <circle cx="200" cy="160" r="4" fill="#FFFFFF" opacity="0.6"/>
  `}
  <text x="200" y="355" text-anchor="middle" font-family="system-ui" font-size="16" font-weight="700" fill="#8B4513">
    ${type === 'pepperoni' ? 'Pepperoni' : 'Margherita'}
  </text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
