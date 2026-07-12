export const TALKO_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" rx="220" fill="#0066ff" />
  <path d="M 370 260 H 630 A 140 140 0 0 1 770 400 V 510 A 140 140 0 0 1 630 650 H 470 L 350 730 V 650 A 120 120 0 0 1 230 530 V 400 A 140 140 0 0 1 370 260 Z" fill="white" />
  <rect x="320" y="345" width="360" height="80" rx="20" fill="#0066ff" />
  <path d="M 425 425 L 390 585 L 490 535 L 540 425 Z" fill="#0066ff" />
  <rect x="545" y="432" width="100" height="46" rx="14" fill="#0066ff" />
</svg>`;
export const TALKO_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(TALKO_LOGO_SVG)}`;

export const TALKO_AI_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19" />
      <stop offset="100%" stop-color="#1A2238" />
    </linearGradient>
    <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="50%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#8B5CF6" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <circle cx="50" cy="50" r="50" fill="url(#bgGrad)" />
  
  <!-- Ambient Glow Ring -->
  <circle cx="50" cy="50" r="44" fill="none" stroke="url(#aiGrad)" stroke-width="1.5" opacity="0.3" />
  
  <!-- AI Core Bubble/Head -->
  <path d="M 22 48 C 22 30, 78 30, 78 48 L 78 58 C 78 72, 60 76, 50 82 C 40 76, 22 72, 22 58 Z" fill="url(#aiGrad)" opacity="0.9" />
  
  <!-- Inner Face Plate -->
  <path d="M 28 50 C 28 38, 72 38, 72 50 L 72 56 C 72 65, 28 65, 28 56 Z" fill="#0B0F19" />
  
  <!-- Glowing Eyes -->
  <rect x="38" y="46" width="6" height="12" rx="3" fill="#60A5FA" />
  <rect x="56" y="46" width="6" height="12" rx="3" fill="#60A5FA" />
  
  <!-- Center Star/Sparkle -->
  <path d="M 50 14 L 52.5 23.5 L 62 26 L 52.5 28.5 L 50 38 L 47.5 28.5 L 38 26 L 47.5 23.5 Z" fill="#FBBF24" />
</svg>`;
export const TALKO_AI_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(TALKO_AI_SVG)}`;

export const TALKO_VERIFIED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <circle cx="500" cy="500" r="450" fill="#F59E0B" />
  <path d="M 300 500 L 450 650 L 700 350" stroke="#FFFFFF" stroke-width="120" stroke-linecap="round" stroke-linejoin="round" fill="none" />
</svg>`;
export const TALKO_VERIFIED_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(TALKO_VERIFIED_SVG)}`;
