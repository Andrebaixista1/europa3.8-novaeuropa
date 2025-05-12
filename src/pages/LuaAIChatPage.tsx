import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import DashboardHeader from "../components/DashboardHeader"; // Ajuste o caminho se necessário
import Button from "../components/Button"; // Ajuste o caminho se necessário
import { useAuth } from "../context/AuthContext"; // Ajuste o caminho se necessário
import { Send, MessageSquare } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner"; // Ajuste o caminho se necessário

// Constante para a URL da API, similar ao IndividualQueryDashboard
export const API_BASE = import.meta.env.DEV
  ? "https://apivieiracred.store" // URL de desenvolvimento
  : ""; // Em produção, usa path relativo

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp?: Date;
}

const saudacaoLua = "Olá! Sou a Lua, a inteligência artificial da Nova Europa. Estou aqui para te auxiliar com consultas de clientes, saldos, higienizações, estratégias de consignado e muito mais.\n\nAinda estou em fase de desenvolvimento, mas já aprendi bastante e posso te ajudar com diversas tarefas. Que tal começar com um teste? Me diga o que você precisa e exploraremos juntos as minhas funcionalidades!";

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
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: "user-" + Date.now(),
      text: inputValue.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/lua-ia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id, message: userMessage.text }),
      });

      if (!response.ok) {
        // Tenta ler uma mensagem de erro do corpo da resposta, se houver
        let errorText = "Falha ao comunicar com a Lua AI.";
        try {
            const errorData = await response.json();
            errorText = errorData.error || errorData.message || errorText;
        } catch (e) {
            // Mantém a mensagem de erro padrão se o corpo não for JSON ou não tiver a info
        }
        throw new Error(errorText);
      }

      const aiData = await response.json();
      // Valida se a resposta da API tem o formato esperado
      if (!aiData || typeof aiData.reply !== 'string') {
        throw new Error("Resposta inesperada da Lua AI.");
      }
      const aiMessageText = aiData.reply;

      const aiMessage: ChatMessage = {
        id: "ai-" + Date.now(),
        text: aiMessageText,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error: any) { // Especifica o tipo do erro para acessar error.message
      console.error("Erro ao enviar mensagem para Lua AI:", error);
      const errorMessage: ChatMessage = {
        id: "ai-error-" + Date.now(),
        text: error.message || "Desculpe, não consegui processar sua mensagem no momento. Tente novamente mais tarde.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
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
          {/* ChatWindow Area */}
          <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: msg.sender === 'user' ? 10 : -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg shadow ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-neutral-200 text-neutral-800 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  {msg.timestamp && (
                    <p className={`text-xs mt-1 ${
                      msg.sender === 'user' ? 'text-blue-200' : 'text-neutral-500'
                    } ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
                <motion.div 
                    initial={{ opacity: 0}}
                    animate={{ opacity: 1}}
                    className="flex justify-start">
                    <div className="max-w-[70%] p-3 rounded-lg shadow bg-neutral-200 text-neutral-800 rounded-bl-none flex items-center">
                        <LoadingSpinner size="xs" colorClass="text-neutral-600" />
                        <span className="ml-2 text-sm">Lua está digitando...</span>
                    </div>
                </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ChatInput Area */}
          <div className="mt-auto pt-4 border-t border-neutral-200">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
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
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send size={18} />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default LuaAIChatPage;

