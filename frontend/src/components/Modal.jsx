import { useEffect } from "react";

export function Modal({ open, title, children, onClose, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded border shadow-sm">
          <div className="p-4 border-b flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{title}</div>
            </div>
            <button className="px-2 py-1 border rounded text-sm" onClick={onClose} type="button">
              Close
            </button>
          </div>
          <div className="p-4">{children}</div>
          {footer ? <div className="p-4 border-t">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title = "Confirm", message, confirmText = "Confirm", cancelText = "Cancel", danger = false, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded" type="button" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`px-3 py-2 rounded text-white ${danger ? "bg-red-700" : "bg-black"}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <div className="text-sm text-gray-700">{message}</div>
    </Modal>
  );
}
