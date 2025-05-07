// src/components/DeleteUserModal.tsx
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";

const API_BASE = import.meta.env.DEV
  ? "http://177.153.62.236:5678/"
  : "";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted?: () => void;
}

const DeleteUserModal: React.FC<Props> = ({ isOpen, onClose, onUserDeleted }) => {
  const [logins, setLogins] = useState<string[]>([]);
  const [selectedLogin, setSelectedLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_BASE}/webhook/api/usuarios`)
      .then(res => res.json())
      .then((data: { login: string }[]) => {
        const unique = Array.from(new Set(data.map(u => u.login)));
        setLogins(unique);
        setSelectedLogin(unique[0] || "");
      })
      .catch(() => toast.error("Erro ao carregar usuários"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleDelete = async () => {
    if (!selectedLogin) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/webhook/api/usuarios/${encodeURIComponent(selectedLogin)}`, {
        method: "DELETE",
      });
      const { status, message } = await res.json() as { status: number; message: string };
      if (status === 200) {
        toast.success(message);
        onClose();
        onUserDeleted?.();
      } else {
        toast.warn(message);
      }
    } catch {
      toast.error("Erro na requisição");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Excluir Usuário</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">
            <X size={20} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            <label htmlFor="login-select" className="block text-sm font-medium text-neutral-700">
              Selecione o login
            </label>
            <select
              id="login-select"
              value={selectedLogin}
              onChange={e => setSelectedLogin(e.target.value)}
              className="europa-input w-full"
            >
              {logins.map(login => (
                <option key={login} value={login}>
                  {login}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleDelete} disabled={deleting || !selectedLogin}>
            {deleting ? <><LoadingSpinner size="sm" /> Excluindo...</> : "Excluir"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;
