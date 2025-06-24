import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { Send } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

export const API_BASE = import.meta.env.DEV
  ? "https://n8n.sistemavieira.com.br"
  : "";

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

  // Rola automaticamente para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    // Adiciona mensagem do usuário na UI
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
      const res = await fetch(`${API_BASE}/webhook/api/lua-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, message: userMessage.text }),
      });

      if (!res.ok) {
        let err = "Falha ao comunicar com a Lua AI.";
        try {
          const j = await res.json();
          err = j.error || j.message || err;
        } catch {}
        throw new Error(err);
      }

      // Tratamento da resposta: pode vir como objeto ou array de objetos
      const data = await res.json();
      const first = Array.isArray(data) ? data[0] : data;
      const output = first.output;
      if (typeof output !== "string") {
        throw new Error("Resposta inesperada da Lua AI.");
      }

      // Adiciona resposta da AI na UI
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: output,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
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

      <main className="flex-1 w-full flex flex-col justify-center items-center px-2 sm:px-6 md:px-16 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-neutral-200 rounded-xl shadow-xl p-2 sm:p-4 md:p-6 w-full max-w-4xl h-full flex flex-col"
        >
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 space-y-3 sm:space-y-4">
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
                  className={`max-w-[90%] sm:max-w-[80%] md:max-w-[70%] p-2 sm:p-3 rounded-lg shadow ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-neutral-200 text-neutral-800 rounded-bl-none"
                  }`}
                >
                  {msg.sender === "ai" ? (
                    <p
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: msg.text }}
                    />
                  ) : (
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

          <div className="pt-4 border-t border-neutral-200 bg-white">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && !isLoading && handleSendMessage()
                }
                placeholder="Digite sua mensagem para Lua..."
                className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200 bg-neutral-50 w-full sm:w-auto"
                disabled={isLoading}
              />
              <Button
                variant="primary"
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="w-full sm:w-auto px-4 py-2"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default LuaAIChatPage;
