import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Clipboard } from "lucide-react";
import EuropaLogo from "../components/EuropaLogo";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
export const API_BASE = import.meta.env.DEV
  ? 'https://webhook.sistemavieira.com.br'
  : ''; // em prod ficará vazio → usa path relativo e o vercel.json proxya


const Login: React.FC = () => {
  const { login, isAuthenticated, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // estados do modal
  const [showModal, setShowModal] = useState(false);
  const [modalLogin, setModalLogin] = useState("");
  const [modalNewPassword, setModalNewPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Username and password are required");
      setIsSubmitting(false);
      return;
    }

    try {
      const success = await login(username, password);
      if (success) {
        navigate(from, { replace: true });
      }
    } catch {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!modalLogin.trim() || !modalNewPassword.trim()) {
      toast.error("Login e nova senha são obrigatórios");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/webhook/api/alterar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: modalLogin,
            senha: modalNewPassword,
          }),
        }
      );
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message || "Erro ao alterar senha");
      } else {
        toast.success("Senha alterada com sucesso");
        setShowModal(false);
        setModalLogin("");
        setModalNewPassword("");
      }
    } catch {
      toast.error("Erro na requisição");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-xl shadow-apple p-8 relative"
      >
        <div className="flex justify-center mb-8">
          <EuropaLogo size="lg" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Login
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="europa-input w-full"
              placeholder="Digite seu usuário"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="europa-input w-full"
              placeholder="Digite sua senha"
              disabled={isSubmitting}
            />
          </div>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-error-500 bg-opacity-10 text-error-500 rounded-lg text-sm"
            >
              {errorMessage}
            </motion.div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting}
            icon={
              isSubmitting ? <LoadingSpinner size="sm" /> : <LogIn size={18} />
            }
            className="py-3 mt-2"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="py-3 mt-2"
          onClick={() => setShowModal(true)}
        >
          Alterar Senha
        </Button>

        
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Alterar Senha</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Login
                  </label>
                  <input
                    type="text"
                    value={modalLogin}
                    onChange={(e) => setModalLogin(e.target.value)}
                    className="europa-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={modalNewPassword}
                    onChange={(e) => setModalNewPassword(e.target.value)}
                    className="europa-input w-full"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleChangePassword}>
                  Alterar
                </Button>
              </div>
            </div>
          </div>
        )}
        <footer className="bg-white py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-neutral-500 text-sm">
          <p>© 2025 Nova Europa. Todos os direitos reservados. Criado e Desenvolvido por André Felipe | Lua  0.1.2025</p>
        </div>
      </footer>


        <ToastContainer position="top-right" autoClose={3000} />
      </motion.div>
    </div>
  );
};

export default Login;
