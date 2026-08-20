import { Trash2, X } from "lucide-react";
import "./overview-delete-confirmation.css";

export function OverviewDeleteConfirmation({ title, message, pending = false, acceptLabel = "Accept", onAccept, onCancel }: { title: string; message: string; pending?: boolean; acceptLabel?: string; onAccept: () => void; onCancel: () => void }) {
  return <div className="overview-confirm-layer" role="presentation"><section className="overview-confirm-toast" role="alertdialog" aria-modal="true" aria-labelledby="overview-confirm-title">
    <button type="button" className="overview-confirm-close" aria-label="Close confirmation" onClick={onCancel} disabled={pending}><X size={17}/></button>
    <span className="overview-confirm-icon"><Trash2 size={20}/></span>
    <div className="overview-confirm-copy"><h2 id="overview-confirm-title">{title}</h2><p>{message}</p></div>
    <footer><button type="button" className="button secondary" onClick={onCancel} disabled={pending}>Cancel</button><button type="button" className="button danger" onClick={onAccept} disabled={pending}>{pending ? "Processing…" : acceptLabel}</button></footer>
  </section></div>;
}
