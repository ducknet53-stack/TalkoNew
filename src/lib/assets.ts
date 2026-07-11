export const TALKO_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <!-- Rounded blue background -->
  <rect width="1000" height="1000" rx="220" fill="#0066ff" />
  
  <!-- White speech bubble with perfect symmetry and proportions -->
  <path d="M 370 260 
           H 630 
           A 140 140 0 0 1 770 400 
           V 510 
           A 140 140 0 0 1 630 650 
           H 470 
           L 350 730 
           V 650 
           A 120 120 0 0 1 230 530 
           V 400 
           A 140 140 0 0 1 370 260 Z" 
        fill="white" />
  
  <!-- Stylized blue T centered nicely inside the speech bubble -->
  <!-- Top bar of the T -->
  <rect x="320" y="345" width="360" height="80" rx="20" fill="#0066ff" />
  
  <!-- Stem of the T (slanted, leaning down-left) inside bubble bounds -->
  <path d="M 425 425 
           L 390 585 
           L 490 535 
           L 540 425 Z" 
        fill="#0066ff" />
        
  <!-- Parallel accent dash on the right -->
  <rect x="545" y="432" width="100" height="46" rx="14" fill="#0066ff" />
</svg>`;

export const TALKO_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(TALKO_LOGO_SVG)}`;
