import { useEffect, useState, type CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ActionToastTone = "success" | "info" | "warning" | "error";

type ActionToastProps = {
  message: string;
  tone?: ActionToastTone;
  duration?: number;
  position?: "top" | "bottom";
  onClose?: () => void;
};

const icons = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

export function ActionToast({ message, tone = "success", duration = 3000, position = "top", onClose }: ActionToastProps) {
  const [visible, setVisible] = useState(true);
  const Icon = icons[tone];

  useEffect(() => {
    setVisible(true);
    const timeout = window.setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, message, onClose]);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    onClose?.();
  };

  return (
    <div className={`action-toast ${tone} ${position}`} role={tone === "error" ? "alert" : "status"} aria-live="polite">
      <Icon className="action-toast-icon" size={20} aria-hidden="true" />
      <span>{message}</span>
      <button
        type="button"
        className="action-toast-close"
        aria-label="Cerrar notificación"
        onClick={close}
        style={{ "--toast-duration": `${duration}ms` } as CSSProperties}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
