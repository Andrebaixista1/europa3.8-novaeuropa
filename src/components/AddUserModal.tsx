// src/components/AddUserModal.tsx
import React, { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";

const API_BASE = import.meta.env.DEV
  ? "http://177.153.62.236:5678/"
  : "";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded?: () => void;
}

const AddUserModal: React.FC<Props> = ({ isOpen, onClose, onUserAdded }) => {
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  const clearFields = () => {
    setNome("");
    setLogin("");
    setSenha("");
  };

  const handleSubmit = async () => {
    if (!nome || !login || !senha) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/webhook/api/criar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, login, senha }),
      });
      const data = await res.json() as { status: number; message: string };
      if (data.status === 200) {
        toast.success(data.message);
        clearFields();
        onClose();
        onUserAdded?.();
      } else {
        toast.warn(data.message);
      }
    } catch {
      toast.error("Erro na requisição");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Adicionar Usuário</h3>
          <button onClick={() => { clearFields(); onClose(); }} className="text-neutral-500 hover:text-neutral-700">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-neutral-700 mb-1">
              Nome
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="europa-input w-full"
              placeholder="Nome completo do usuário"
            />
          </div>
          <div>
            <label htmlFor="login" className="block text-sm font-medium text-neutral-700 mb-1">
              Login
            </label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              className="europa-input w-full"
              placeholder="Login de acesso"
            />
          </div>
          <div className="relative">
            <label htmlFor="senha" className="block text-sm font-medium text-neutral-700 mb-1">
              Senha
            </label>
            <input
              id="senha"
              type={showPassword ? "text" : "password"}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="europa-input w-full pr-12"
              placeholder="Senha (mínimo 6 caracteres)"
            />
            &nbsp;
            <button
              type="button"
              onClick={toggleShowPassword}
              className="absolute inset-y-0 right-4 flex items-center text-neutral-500"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={() => { clearFields(); onClose(); }} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? <><LoadingSpinner size="sm" /> Salvando...</>
              : "Salvar"
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
