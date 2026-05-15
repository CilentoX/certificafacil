import useToastStore from '../stores/toastStore';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export function useToast() {
  return useToastStore();
}

const icons = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
};

export default function ToastContainer() {
  const { toasts } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {icons[t.type] || icons.info}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
