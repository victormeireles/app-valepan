# Componente Logo

Componente responsivo para exibir a logo da Valepan em diferentes contextos.

## Uso Básico

```tsx
import Logo from '@/components/Logo';

// Logo automática (detecta tema)
<Logo />

// Logo específica para tema claro
<Logo variant="light" />

// Logo específica para tema escuro
<Logo variant="dark" />
```

## Contextos Pré-definidos

```tsx
// Sidebar expandida
<Logo context="sidebar" />

// Sidebar colapsada
<Logo context="sidebarCollapsed" />

// Página de login
<Logo context="login" />

// Cabeçalho
<Logo context="header" />
```

## Propriedades

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `width` | `number` | - | Largura personalizada (sobrescreve contexto) |
| `height` | `number` | - | Altura personalizada (sobrescreve contexto) |
| `className` | `string` | `''` | Classes CSS adicionais |
| `priority` | `boolean` | `false` | Prioridade de carregamento |
| `variant` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Variante da logo |
| `context` | `'sidebar' \| 'sidebarCollapsed' \| 'login' \| 'header'` | - | Contexto pré-definido |

## Configuração

As configurações de marca estão em `src/config/branding.ts`:

- Caminhos das logos
- Tamanhos para cada contexto
- Nome da empresa
- Configurações do favicon

## Arquivos de Logo

- **Logo clara**: `public/assets/logos/logo-light.svg`
- **Logo escura**: `public/assets/logos/logo-dark.svg`
- **Favicon**: `public/favicon.ico` e `public/favicon.png`
