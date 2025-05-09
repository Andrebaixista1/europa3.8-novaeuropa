// src/components/AddRechargeModal.tsx
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";

const API_BASE = import.meta.env.DEV
  ? "http://177.153.62.236:5679/" // API_BASE termina com barra
  : "";

interface Usuario {
  id: number;
  nome: string;
  login: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRechargeAdded?: () => void;
}

const AddRechargeModal: React.FC<Props> = ({ isOpen, onClose, onRechargeAdded }) => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [selectedLogin, setSelectedLogin] = useState("");
  const [creditAmount, setCreditAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    // Ajustado para ser igual ao DeleteUserModal (pasted_content_2.txt)
    // Se API_BASE já tem "/", resultará em "//webhook..."
    fetch(`${API_BASE}/webhook/api/usuarios`) 
      .then(res => {
        if (!res.ok) {
          throw new Error(`Erro HTTP ${res.status} ao buscar usuários`);
        }
        return res.json();
      })
      .then((data: Usuario[]) => {
        const unique = Array.from(new Map(data.map(u => [u.login, u])).values());
        setUsers(unique);
        setSelectedLogin(unique[0]?.login || "");
      })
      .catch((error) => {
        console.error("Falha ao carregar usuários:", error);
        toast.error("Erro ao carregar usuários. Verifique o console para detalhes.");
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const selectedUser = users.find(u => u.login === selectedLogin);

  const confirmAdd = async () => {
    if (!selectedUser) return;
    setAdding(true);
    try {
      // Mantendo a URL original para carregar-saldo, que parecia correta (API_BASE + webhook...)
      const res = await fetch(`${API_BASE}/webhook/api/carregar-saldo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          login: selectedUser.login,
          valor: creditAmount
        }),
      });
      const data = await res.json() as { status: number; message: string };
      if (data.status === 200) {
        toast.success(data.message);
        onClose();
        onRechargeAdded?.();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Falha ao carregar saldo:", error);
      toast.error("Erro ao tentar carregar saldo. Verifique o console para detalhes.");
    } finally {
      setAdding(false);
      setShowConfirm(false);
    }
  };

  const clearFields = () => {
    setSelectedLogin(users[0]?.login || "");
    setCreditAmount(0);
    setShowConfirm(false);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Adicionar Recarga</h3>
          <button
            onClick={() => { clearFields(); onClose(); }}
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
              Tem certeza que deseja carregar <strong>{creditAmount}</strong> créditos para{" "}
              <strong>{selectedUser?.nome}</strong>?
            </p>
            <div className="flex justify-center space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                disabled={adding}
              >
                Não
              </Button>
              <Button
                variant="primary"
                onClick={confirmAdd}
                disabled={adding}
              >
                {adding ? <><LoadingSpinner size="sm" /> Carregando...</> : "Sim"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="login-select" className="block text-sm font-medium text-neutral-700 mb-1">
                Selecione o login
              </label>
              <select
                id="login-select"
                value={selectedLogin}
                onChange={e => setSelectedLogin(e.target.value)}
                className="europa-input w-full"
                disabled={users.length === 0} // Desabilita se não houver usuários
              >
                {users.length === 0 && !loading && (
                  <option value="" disabled>Nenhum usuário carregado</option>
                )}
                {users.map(u => (
                  <option key={u.login} value={u.login}>
                    {u.login}
                  </option>
                ))}
              </select>
            </div>
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
            <div>
              <label htmlFor="credit-amount" className="block text-sm font-medium text-neutral-700 mb-1">
                Valor 
              </label>
              <input
                id="credit-amount"
                type="number"
                value={creditAmount}
                onChange={e => setCreditAmount(Number(e.target.value))}
                className="europa-input w-full"
                min={1}
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="secondary" onClick={() => { clearFields(); onClose(); }} disabled={adding}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => setShowConfirm(true)} disabled={!selectedLogin || creditAmount <= 0 || users.length === 0}>
                Carregar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddRechargeModal;

