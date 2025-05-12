import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { Send } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

// Constante para a URL da API
export const API_BASE = import.meta.env.DEV
  ? "https://apivieiracred.store"
  : "";

// Mensagem inicial com HTML
const saudacaoLua = `
  Olá! 🌙✨<br/>
  Eu sou a <strong>Lua</strong>, a inteligência artificial da <strong>Nova Europa</strong> 🤖💙<br/>
  Estou aqui para te ajudar com:<br/>
  • Consultas de clientes 👥🔍<br/>
  • Saldos 💰📊<br/>
  • Higienizações 🧼✨<br/>
  • Estratégias de consignado 🎯📝<br/>
  …e muito mais! 🚀<br/><br/>

  Ainda estou em fase de desenvolvimento, mas já aprendi bastante e posso te apoiar em diversas tarefas 🌱📚<br/>
  Que tal fazermos um teste? Me conta o que você precisa e vamos explorar juntos todas as minhas funcionalidades! 😉👍
`;

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp?: Date;
}

const LuaAIChatPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "lua-initial-" + Date.now(),
      text: saudacaoLua,
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Mantém a rolagem sempre lá embaixo
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    // 1) adiciona mensagem do usuário na UI
    const userMessage: ChatMessage = {
      id: "user-" + Date.now(),
      text: inputValue.trim(),
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // 2) chama o endpoint correto
      const res = await fetch(`${API_BASE}/webhook/api/lua-ia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          message: userMessage.text,
        }),
      });

      if (!res.ok) {
        let err = "Falha ao comunicar com a Lua AI.";
        try {
          const j = await res.json();
          err = j.error || j.message || err;
        } catch {}
        throw new Error(err);
      }

      // 3) parse do array que chega: [{ id, message }]
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Resposta inesperada da Lua AI.");
      }
      const { id: conversationId, message: aiReply } = data[0];

      // 4) adiciona resposta da IA na UI
      const aiMessage: ChatMessage = {
        id: `ai-${conversationId}-${Date.now()}`,
        text: aiReply,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      console.log("ID de conversa:", conversationId);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: "ai-error-" + Date.now(),
          text:
            error.message ||
            "Desculpe, não consegui processar sua mensagem no momento.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Chat com Lua AI" />
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-neutral-200 rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-3xl flex flex-col h-[calc(100vh-200px)] sm:h-[calc(100vh-220px)]"
        >
          {/* ChatWindow */}
          <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{
                  opacity: 0,
                  y: msg.sender === "user" ? 10 : -10,
                }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg shadow ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-neutral-200 text-neutral-800 rounded-bl-none"
                  }`}
                >
                  {msg.sender === "ai" ? (
                    // renderiza HTML para as mensagens da IA
                    <p
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: msg.text }}
                    />
                  ) : (
                    // usuário continua renderizando texto puro
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  )}
                  {msg.timestamp && (
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === "user"
                          ? "text-blue-200 text-right"
                          : "text-neutral-500 text-left"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="max-w-[70%] p-3 rounded-lg shadow bg-neutral-200 text-neutral-800 rounded-bl-none flex items-center">
                  <LoadingSpinner size="xs" colorClass="text-neutral-600" />
                  <span className="ml-2 text-sm">Lua está digitando...</span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ChatInput */}
          <div className="mt-auto pt-4 border-t border-neutral-200">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && !isLoading && handleSendMessage()
                }
                placeholder="Digite sua mensagem para Lua..."
                className="europa-input flex-1 !py-3"
                disabled={isLoading}
              />
              <Button
                variant="primary"
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="!px-4 !py-3"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : <Send size={18} />}
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default LuaAIChatPage;
