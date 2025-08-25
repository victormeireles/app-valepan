import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #090c12 0%, #0f1420 60%, #090c12 100%)',
      color: '#f2f4f7',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0', color: '#e67e22' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>Página não encontrada</h2>
      <p style={{ fontSize: '1rem', opacity: 0.8, margin: '0 0 2rem 0' }}>
        A página que você está procurando não existe.
      </p>
      <Link 
        href="/" 
        style={{
          background: 'linear-gradient(180deg, #e67e22, #cf6e1d)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '600',
          transition: 'transform 0.2s ease',
          display: 'inline-block'
        }}
      >
        Voltar ao início
      </Link>
    </div>
  );
}
