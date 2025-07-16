import React, { useEffect, useState, useRef, ReactNode } from "react"; // Adiciona useState, useRef e ReactNode
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Database,
  Search,
  LogIn,
  UserPlus,
  Wallet,
  Brain,
  Landmark,
  PiggyBank,
  Workflow,
  LogOut,
} from "lucide-react";
import EuropaLogo from "../components/EuropaLogo";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface QueryOptionProps {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

// Componente para efeito de máquina de escrever rotativo
const TypewriterRotator: React.FC<{ frases: string[] }> = ({ frases }) => {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fraseAtual = frases[index];
    if (!deleting && charIndex < fraseAtual.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayed(fraseAtual.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      }, 50);
    } else if (!deleting && charIndex === fraseAtual.length) {
      timeoutRef.current = setTimeout(() => {
        setDeleting(true);
      }, 3000);
    } else if (deleting && charIndex > 0) {
      timeoutRef.current = setTimeout(() => {
        setDisplayed(fraseAtual.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      }, 30);
    } else if (deleting && charIndex === 0) {
      timeoutRef.current = setTimeout(() => {
        setDeleting(false);
        setIndex((i) => (i + 1) % frases.length);
      }, 500);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [charIndex, deleting, frases, index]);

  return (
    <span className="inline-block min-h-[2.5em]" style={{ textTransform: 'none' }}>
      {displayed}
      <span className="blinking-cursor">|</span>
      <style>{`
        .blinking-cursor {
          display: inline-block;
          width: 1ch;
          animation: blink 1s steps(1) infinite;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </span>
  );
};

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F5" || event.keyCode === 116) {
        event.preventDefault(); // Previne o comportamento padrão de atualização do F5
        window.location.href = "https://consulta-in100.vercel.app/"; // Redireciona para a URL especificada
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup: remover o event listener quando o componente for desmontado
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []); // Array de dependências vazio para rodar o efeito apenas uma vez (montagem/desmontagem)

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
  
  const handleLuaAiQuery = () => {
    if (isAuthenticated) {
      navigate("/dashboard/lua-ai");
    } else {
      navigate("/login", { state: { from: "/dashboard/lua-ai" } });
    }
  };
  
  const handleConexaoWhats = () => {
    if (isAuthenticated) {
      navigate("/dashboard/conexao-whats");
    } else {
      navigate("/login", { state: { from: "/dashboard/conexao-whats" } });
    }
  };
  
  const handleConsultaFGTS = () => {
    if (isAuthenticated) {
      navigate("/dashboard/consulta-fgts");
    } else {
      navigate("/login", { state: { from: "/dashboard/consulta-fgts" } });
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
            <div className="flex items-center gap-4">
              <span className="text-neutral-600">Bem-vindo, {user.username}</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { logout(); navigate("/login"); }}
                className="flex items-center text-neutral-600 hover:text-primary-600 transition-colors border border-neutral-200 rounded px-3 py-1"
              >
                <LogOut size={18} className="mr-1" />
                <span>Logout</span>
              </motion.button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-6xl mx-auto text-center"
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
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mx-auto"
          >
            <QueryOption
              icon={<Brain size={32} className="text-white" />}
              // title={
              //   <>
              //     Lua AI (Inteligência Artificial) <br></br>
              //     <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
              //       Beta
              //     </span>
              //   </>
              // }
              title={
                <>
                  Lua AI (Inteligência Artificial) <br></br>
                  <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
                    Em Reforma
                  </span>
                </>
              }
              description={
                <TypewriterRotator
                  frases={[
                    "A inteligência da VieiraCred chegou para facilitar.",
                    "A Lua responde rápido e direto.",
                    "FGTS disponível na Lua, sem complicação.",
                    "Consulta simples.",
                    "Sala de reunião pode ser agendada por aqui!"
                  ]}
                />
              }
              onClick={handleLuaAiQuery}
              disabled={true}
            />
            <QueryOption
              icon={<Database size={32} className="text-white" />}
              title={
                <>
                  Consulta em Lote{" "}
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                    Bloqueada
                  </span>
                </>
              }
              description="Faça consultas em lote para múltiplos cadastros de uma só vez."
              onClick={handleBatchQuery}
              disabled={
                !(isAuthenticated && user?.hierarquia === 1)
              }
            />

            <QueryOption
              icon={<Search size={32} className="text-white" />}
              title={
                <>
                  Consulta Individual{" "}
                </>
              }
              description="Pesquise informações específicas com precisão e resultados detalhados."
              onClick={handleIndividualQuery}
              disabled={false}
            />

            <QueryOption
              icon={<PiggyBank size={32} className="text-white" />}
              title={
                <>
                  Consulta FGTS <br></br>
                  {/* <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
                    Em Breve
                  </span> */}
                </>
              }
              description="Consulte clientes com o FGTS liberado."
              onClick={handleConsultaFGTS}
              disabled={false}
            />
            <QueryOption
              icon={<Workflow size={32} className="text-white" />}
              title={
                <>
                  Conexão Whatsapp <br></br>
                  <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
                    Em Breve - "Alpha v1.0.2025"
                  </span>
                </>
              }
              description={
                <>
                  <p>
                    Aqui você conecta seu Whatsapp e faz disparos!{" "}
                    <span className="relative group inline-block ml-1 cursor-pointer">
                      <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                        i
                      </span>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        Esta é a primeira versão de disparos de Whatsapp. Por
                        enquanto, mensagem e tempo já são pré-definidos.
                      </span>
                    </span>
                  </p>
                  <br />
                </>
              }
              onClick={handleConexaoWhats}
              disabled={
                !(isAuthenticated && user?.hierarquia === 1)
              }
            />

            <QueryOption
              icon={<UserPlus size={32} className="text-white" />}
              title="Gestão de Usuarios"
              description="Gerencie e crie novos logins de acesso."
              onClick={() => navigate("/dashboard/create-logins")}
              disabled={
                !(isAuthenticated && user?.hierarquia === 1)
              }
            />

            <QueryOption
              icon={<Wallet size={32} className="text-white" />}
              title="Gestão de Recargas"
              description="Administração eficiente de recargas de saldo."
              onClick={() => navigate("/dashboard/recharge-user")}
              disabled={
                !(isAuthenticated && user?.hierarquia === 1)
              }
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
    <div className={`${disabled ? "text-yellow-600" : "text-neutral-600"} mb-6`}>
      {description}
    </div>
    <Button variant="primary" fullWidth disabled={disabled}>
      Começar Agora
    </Button>
  </motion.div>
);

export default Landing;
