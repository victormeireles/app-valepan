# Valepan Dashboard

Dashboard operacional e gerencial para fábrica de pães integrado com Google Sheets.

## 🚀 Deploy na Vercel

### 1. Preparação
```bash
npm install
npm run build
```

### 2. Variáveis de Ambiente (Vercel)
Configure estas variáveis no painel da Vercel:

### 3. Configuração Google OAuth
- Acesse [Google Cloud Console](https://console.cloud.google.com/)
- Vá em "APIs & Services" > "Credentials"
- Edite seu OAuth 2.0 Client ID
- Adicione nas "Authorized JavaScript origins":
  - `https://seu-dominio.vercel.app`
- Adicione nas "Authorized redirect URIs":
  - `https://seu-dominio.vercel.app/api/auth/callback/google`

## 📊 Funcionalidades

- ✅ Login via Google OAuth
- ✅ Dashboard de Vendas
- ✅ Dashboard de Produção
- ✅ KPIs dinâmicos
- ✅ Filtros de período
- ✅ Integração com Google Sheets
- 🔄 Gráficos interativos (em desenvolvimento)

## 🛠 Stack

- **Framework**: Next.js 15.4.6
- **Auth**: NextAuth.js v5
- **Styling**: TailwindCSS
- **Charts**: Chart.js + chartjs-plugin-datalabels
- **Data**: Google Sheets API
- **Deploy**: Vercel