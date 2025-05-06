import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Database, Search, LogIn, UserPlus } from "lucide-react";
import EuropaLogo from "../components/EuropaLogo";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


interface QueryOptionProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleBatchQuery = () => {
    if (isAuthenticated) {
      navigate("/dashboard/batch");
    } else {
      navigate("/login", { state: { from: "/dashboard/batch" } });
    }
  };

  const handleIndividualQuery = () => {
    if (isAuthenticated) {
      navigate("/dashboard/individual");
    } else {
      navigate("/login", { state: { from: "/dashboard/individual" } });
    }
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <EuropaLogo size="md" />
          {!isAuthenticated ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="secondary"
                onClick={handleLoginClick}
                icon={<LogIn size={18} />}
              >
                Entrar
              </Button>
            </motion.div>
          ) : (
            <span className="text-neutral-600">Bem-vindo, {user.username}</span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-blue-gradient"
          >
            Bem-vindo à Nova Europa
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-neutral-600 mb-12 max-w-2xl mx-auto"
          >
            A plataforma moderna para consultas e gerenciamento eficiente de
            dados. Escolha seu tipo de consulta abaixo para começar.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto"
          >
            <QueryOption
              icon={<Database size={32} className="text-white" />}
              title={
                <>
                  Consulta em Lote{" "}
                  <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
                    Em Breve
                  </span>
                </>
              }
              description="Faça consultas em lote para múltiplos cadastros de uma só vez."
              onClick={handleBatchQuery}
              disabled={true}
            />

            <QueryOption
              icon={<Search size={32} className="text-white" />}
              title="Consulta Individual"
              description="Pesquise informações específicas com precisão e resultados detalhados."
              onClick={handleIndividualQuery}
            />

            <QueryOption
              icon={<UserPlus size={32} className="text-white" />}
              title="Criar Logins"
              description="Gerencie e crie novos logins de acesso."
              onClick={() => navigate("/dashboard/create-logins")}
              disabled={!(isAuthenticated && user?.id === 1)}
            />
          </motion.div>
        </motion.div>
      </main>

      <footer className="bg-white py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-neutral-500 text-sm">
          <p>
            © 2025 Nova Europa. Todos os direitos reservados. Criado e
            Desenvolvido por André Felipe | Lua 0.1.2025
          </p>
        </div>
      </footer>

      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
};

const QueryOption: React.FC<QueryOptionProps> = ({
  icon,
  title,
  description,
  onClick,
  disabled = false,
}) => (
  <motion.div
    whileHover={{
      y: disabled ? 0 : -5,
      boxShadow: disabled ? "none" : "0 8px 30px rgba(0, 122, 255, 0.2)",
    }}
    className={`bg-white rounded-xl shadow-apple p-6 text-center transition-all duration-300 ${
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
    }`}
    onClick={disabled ? undefined : onClick}
  >
    <div className="flex justify-center mb-4">
      <div
        className={`w-16 h-16 rounded-full ${
          disabled ? "bg-neutral-300" : "europa-gradient"
        } flex items-center justify-center`}
      >
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-semibold mb-3">{title}</h3>
    <p className={`${disabled ? "text-yellow-600" : "text-neutral-600"} mb-6`}>
      {description}
    </p>
    <Button variant="primary" fullWidth disabled={disabled}>
      Começar Agora
    </Button>
  </motion.div>
);

export default Landing;