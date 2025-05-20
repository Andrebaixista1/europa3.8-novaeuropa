// src/components/DeleteUserModal.tsx
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";

const API_BASE = import.meta.env.DEV
  ? "https://webhook.sistemavieira.com.br"
  : "";

interface Usuario {
  id: number;
  nome: string;
  login: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted?: () => void;
}

const DeleteUserModal: React.FC<Props> = ({ isOpen, onClose, onUserDeleted }) => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [selectedLogin, setSelectedLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_BASE}/webhook/api/usuarios`)
      .then(res => res.json())
      .then((data: Usuario[]) => {
        const unique = Array.from(new Map(data.map(u => [u.login, u])).values());
        setUsers(unique);
        setSelectedLogin(unique[0]?.login || "");
      })
      .catch(() => toast.error("Erro ao carregar usuários"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const selectedUser = users.find(u => u.login === selectedLogin);

  const confirmDelete = async () => {
    if (!selectedUser) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/webhook/api/excluir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser.id, login: selectedUser.login }),
      });
      const data = await res.json() as { status: number; message: string };
      if (data.status === 200) {
        toast.success(data.message);
        onClose();
        onUserDeleted?.();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Erro ao tentar excluir");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Excluir Usuário</h3>
          <button
            onClick={() => {
              setShowConfirm(false);
              onClose();
            }}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X size={20} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : showConfirm ? (
          <div className="space-y-6">
            <p className="text-center">
              Tem certeza que deseja excluir{" "}
              <strong>{selectedUser?.nome}</strong>?
            </p>
            <div className="flex justify-center space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
              >
                Não
              </Button>
              <Button
                variant="primary"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <><LoadingSpinner size="sm" /> Excluindo...</>
                ) : (
                  "Sim"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label
              htmlFor="login-select"
              className="block text-sm font-medium text-neutral-700"
            >
              Selecione o login
            </label>
            <select
              id="login-select"
              value={selectedLogin}
              onChange={e => setSelectedLogin(e.target.value)}
              className="europa-input w-full"
            >
              {users.map(u => (
                <option key={u.login} value={u.login}>
                  {u.login}
                </option>
              ))}
            </select>
            {selectedUser && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">ID</label>
                  <input
                    type="text"
                    value={selectedUser.id}
                    disabled
                    className="europa-input w-full bg-neutral-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={selectedUser.nome}
                    disabled
                    className="europa-input w-full bg-neutral-100 cursor-not-allowed"
                  />
                </div>
              </>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="secondary" onClick={onClose} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowConfirm(true)}
                disabled={!selectedLogin}
              >
                Excluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteUserModal;
