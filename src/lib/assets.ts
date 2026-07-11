export const TALKO_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <!-- Rounded blue background -->
  <rect width="1000" height="1000" rx="220" fill="#0066ff" />
  
  <!-- White speech bubble -->
  <path d="M 320 230 
           H 680 
           C 780 230, 810 260, 810 360 
           C 810 460, 780 490, 680 490 
           H 450 
           L 330 610 
           V 490 
           C 220 490, 190 460, 190 360 
           C 190 260, 220 230, 320 230 Z" 
        fill="white" />
  
  <!-- Stylized blue T -->
  <!-- Top bar of the T -->
  <rect x="292" y="325" width="418" height="92" rx="22" fill="#0066ff" />
  
  <!-- Stem of the T (slanted, leaning down-left) -->
  <path d="M 415 417 
           L 376 615 
           L 500 550 
           L 550 417 Z" 
        fill="#0066ff" />
        
  <!-- Parallel accent dash on the right -->
  <rect x="555" y="425" width="115" height="52" rx="15" fill="#0066ff" />
</svg>`;

export const TALKO_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(TALKO_LOGO_SVG)}`;
