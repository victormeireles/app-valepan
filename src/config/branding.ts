// Configurações de marca e identidade visual
export const BRANDING_CONFIG = {
  companyName: 'EasyDash',
  description: 'Dashboards simples e eficientes',
  
  // Caminhos das logos
  logos: {
    light: '/assets/logos/logo-dark.png',
    dark: '/assets/logos/logo-dark.png',
    // Logo compacta para menu colapsado
    compact: '/favicon.png',
  },
  
  // Configurações do favicon
  favicon: {
    ico: '/favicon.ico',
    png: '/favicon.png',
  },
  
  // Tamanhos padrão para diferentes contextos
  logoSizes: {
    sidebar: { width: 80, height: 28 },
    sidebarCollapsed: { width: 40, height: 40 },
    login: { width: 120, height: 40 },
    header: { width: 150, height: 48 },
  },
} as const;

export type LogoVariant = 'light' | 'dark' | 'auto';
export type LogoContext = keyof typeof BRANDING_CONFIG.logoSizes;
