import loadingStyles from '@/styles/loading.module.css';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export default function LoadingOverlay({ show, message = "Processando dados..." }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className={loadingStyles.loading}>
      <div className={loadingStyles['bg-animations']}>
        <div className={`${loadingStyles.orb} ${loadingStyles['orb-a']}`}></div>
        <div className={`${loadingStyles.orb} ${loadingStyles['orb-b']}`}></div>
        <div className={loadingStyles['grid-overlay']}></div>
      </div>
      <div className={loadingStyles.spinner}></div>
      <div className={loadingStyles['loading-text']}>{message}</div>
    </div>
  );
}
