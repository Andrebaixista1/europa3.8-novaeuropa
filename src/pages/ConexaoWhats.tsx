import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link as LinkIcon, User as UserIcon, Trash, LogOut } from "lucide-react";
import InputMask from "react-input-mask";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

export const N8N_WS_BASE = import.meta.env.DEV
  ? "https://n8n.sistemavieira.com.br/webhook"
  : "/webhook";

export const N8N_NEW_CONN_URL = import.meta.env.DEV
  ? "https://n8n.sistemavieira.com.br/webhook/api/nova-conexao"
  : "/webhook/api/nova-conexao";

interface Connection {
  id: number;
  nome: string;
  numero: string;
  status: "Conectado" | "Desconectado";
  dataCadastro: string;
  qrCode: string;
}

const ConexaoWhats: React.FC = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [qrImage, setQrImage] = useState<string>("");
  const [form, setForm] = useState({
    nome: "",
    numero: "+55 11 ",
    integration: "WHATSAPP-BAILEYS",
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const hasFetchedConnections = useRef(false);
  // Novo estado para modal de QRCode da API externa
  const [isExternalQrModalOpen, setIsExternalQrModalOpen] = useState(false);
  const [externalQrBase64, setExternalQrBase64] = useState<string>("");
  const [pairingCode, setPairingCode] = useState<string>("");
  // Novo estado para controlar polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  // Estado para status de conexão e contador
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [qrProgress, setQrProgress] = useState<number>(0);
  const QR_TIMEOUT_MS = 30000;
  const MAX_QR_ATTEMPTS = 5;
  const [qrAttempts, setQrAttempts] = useState<number>(0);
  const qrProgressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const qrAttemptStartRef = useRef<number>(0);

  async function fetchConnections() {
    if (!user) return;
    try {
      const res = await fetch(`${N8N_WS_BASE}/api/conexoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: user.id }),
      });
      if (res.status === 200) {
        const data = await res.json();
        setConnections(
          data.map((item: any) => ({
            id: item.id,
            nome: item.nome,
            numero: item.numero_zap,
            status: item.status, // usa o status retornado do backend
            dataCadastro: new Date(item.data_cadastro).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            qrCode: item.qr_code,
          }))
        );
      } else if (res.status === 400) {
        const err = await res.json();
        toast.info(err.mensagem, { autoClose: 3000 });
        setConnections([]);
      } else {
        throw new Error("Erro desconhecido ao carregar conexões");
      }
    } catch (err: any) {
      toast.error(err.message, { autoClose: 3000 });
    }
  }

  useEffect(() => {
    if (user && !hasFetchedConnections.current) {
      fetchConnections();
      hasFetchedConnections.current = true;
    }
  }, [user]);

  function openAddModal() {
    setIsModalOpen(true);
  }
  function closeAddModal() {
    setForm({ nome: "", numero: "+55 11 ", integration: "WHATSAPP-BAILEYS" });
    setIsModalOpen(false);
  }
  function openQrModal() {
    setIsQrModalOpen(true);
  }
  function closeQrModal() {
    setIsQrModalOpen(false);
  }
  function openDeleteModal(id: number) {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  }
  function closeDeleteModal() {
    setDeleteTargetId(null);
    setIsDeleteModalOpen(false);
  }

  async function handleConnect() {
    if (!form.nome.trim()) {
      toast.error("Nome do WhatsApp é obrigatório", { autoClose: 3000 });
      return;
    }
    setIsConnecting(true);
    try {
      // Chamada para API externa de criação de instância
      const payload = {
        instanceName: form.nome,
        number: form.numero.replace(/\D/g, ""),
        integration: form.integration,
        qrcode: true,
        alwaysOnline: true,
      };
      const res = await fetch("https://api.sistemavieira.com.br/instance/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "qEmZZ6oHNj8LjrQsngKCniV3",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao criar instância WhatsApp");
      }
      const json = await res.json();
      if (json.qrcode && json.qrcode.base64) {
        setExternalQrBase64(json.qrcode.base64);
        setPairingCode(json.qrcode.pairingCode || "");
        setIsExternalQrModalOpen(true);
        setIsModalOpen(false);
        startPollingInstanceStatus(form.nome);
      } else {
        toast.error("QR Code não retornado pela API.");
      }
    } catch (err: any) {
      toast.error(err.message, { autoClose: 3000 });
    } finally {
      setIsConnecting(false);
    }
  }

  function handleQrClose() {
    setQrImage("");
    closeQrModal();
    closeAddModal();
  }

  async function confirmDelete() {
    if (!user || deleteTargetId === null) return;
    try {
      const res = await fetch(`${N8N_WS_BASE}/api/excluir-conexoes`, {
      // const res = await fetch(`https://n8n.sistemavieira.com.br/webhook-test/api/excluir-conexoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: user.id,
          id: deleteTargetId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.mensagem || "Erro ao excluir conexão");
      }
      toast.success("Conexão excluída com sucesso!", { autoClose: 3000 });
      await fetchConnections();
    } catch (err: any) {
      toast.error(err.message, { autoClose: 3000 });
    } finally {
      closeDeleteModal();
    }
  }

  // Função para iniciar polling após exibir QR Code
  const startPollingInstanceStatus = (instanceName: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    if (qrProgressTimerRef.current) clearInterval(qrProgressTimerRef.current);
    setConnectionStatus("");
    setCountdown(null);
    setQrProgress(0);
    setQrAttempts(0);
    // Barra de progresso baseada em tempo real
    qrAttemptStartRef.current = Date.now();
    qrProgressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - qrAttemptStartRef.current;
      setQrProgress(Math.min((elapsed / QR_TIMEOUT_MS) * 100, 100));
    }, 100);
    const qrTimeoutLoop = () => {
      qrTimeoutRef.current = setTimeout(async () => {
        if (connectionStatus !== "open") {
          setQrAttempts((prev) => {
            const next = prev + 1;
            if (next >= MAX_QR_ATTEMPTS) {
              // Fechar modal após 5 tentativas
              setIsExternalQrModalOpen(false);
              if (qrProgressTimerRef.current) clearInterval(qrProgressTimerRef.current);
              setQrProgress(0);
              toast.warn("Nenhum número foi conectado.", { autoClose: 4000 });
              return next;
            }
            // Tenta novo QR Code
            (async () => {
              try {
                const res = await fetch(`https://api.sistemavieira.com.br/instance/connect/${encodeURIComponent(instanceName)}?number=${form.numero.replace(/\D/g, "")}`, {
                  method: "GET",
                  headers: { "apikey": "qEmZZ6oHNj8LjrQsngKCniV3" }
                });
                if (res.ok) {
                  const json = await res.json();
                  // Suporta resposta direta ou dentro de qrcode
                  if (json.qrcode && json.qrcode.base64) {
                    setExternalQrBase64(json.qrcode.base64);
                    setPairingCode(json.qrcode.pairingCode || "");
                  } else if (json.base64) {
                    setExternalQrBase64(json.base64);
                    setPairingCode(json.pairingCode || "");
                  }
                }
              } catch {}
            })();
            // Reinicia barra e timeout
            qrAttemptStartRef.current = Date.now();
            setQrProgress(0);
            qrTimeoutLoop();
            return next;
          });
        } else {
          if (qrProgressTimerRef.current) clearInterval(qrProgressTimerRef.current);
          setQrProgress(0);
        }
      }, QR_TIMEOUT_MS);
    };
    qrTimeoutLoop();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`https://api.sistemavieira.com.br/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`, {
          method: "GET",
          headers: {
            "apikey": "qEmZZ6oHNj8LjrQsngKCniV3"
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        // Pode ser array ou objeto, garantir array
        const arr = Array.isArray(data) ? data : [data];
        const found = arr.find((i) => i.name === instanceName);
        if (found) {
          setConnectionStatus(found.connectionStatus);
          if (found.connectionStatus === "open") {
            // Chama chatwoot/set
            fetch(`https://api.sistemavieira.com.br/chatwoot/set/${encodeURIComponent(instanceName)}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": "qEmZZ6oHNj8LjrQsngKCniV3",
              },
              body: JSON.stringify({
                "accountId": "1",
                "autoCreate": true,
                "conversationPending": false,
                "daysLimitImportMessages": 7,
                "enabled": true,
                "ignoreJids": [],
                "importContacts": false,
                "importMessages": false,
                "logo": "",
                "mergeBrazilContacts": false,
                "nameInbox": instanceName,
                "organization": "",
                "reopenConversation": false,
                "signDelimiter": "\\n",
                "signMsg": true,
                "token": "d495fQFtYHNiCAKMFTNSvrbo",
                "url": "https://chatwoot.sistemavieira.com.br/"
              })
            });
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            // Iniciar countdown para fechar modal
            setCountdown(3);
          }
        } else {
          setConnectionStatus("");
        }
      } catch (e) {}
    }, 3000);
  };

  // Efeito para countdown e fechar modal
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setIsExternalQrModalOpen(false);
      setCountdown(null);
      setConnectionStatus("");
      setQrProgress(0);
      if (qrTimeoutRef.current) {
        clearTimeout(qrTimeoutRef.current);
        qrTimeoutRef.current = null;
      }
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c ? c - 1 : 0)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Função para chamar a API chatwoot/set/[nome do whatsapp] ao fechar o modal do QR Code
  const handleCloseExternalQrModal = () => {
    setIsExternalQrModalOpen(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
    if (qrProgressTimerRef.current) {
      clearInterval(qrProgressTimerRef.current);
      qrProgressTimerRef.current = null;
    }
    setQrProgress(0);
    setQrAttempts(0);
  };

  // Efeito para parar loops/timers quando conectar
  useEffect(() => {
    if (connectionStatus === "open") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (qrTimeoutRef.current) {
        clearTimeout(qrTimeoutRef.current);
        qrTimeoutRef.current = null;
      }
      if (qrProgressTimerRef.current) {
        clearInterval(qrProgressTimerRef.current);
        qrProgressTimerRef.current = null;
      }
      setQrProgress(0);

      // Chamar API para adicionar conexão
      try {
        const now = new Date();
        const dateTimeSP = new Intl.DateTimeFormat('sv-SE', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
          hour12: false,
          timeZone: 'America/Sao_Paulo'
        }).format(now).replace('T', ' ');
        fetch('https://n8n.sistemavieira.com.br/webhook/api/adiciona-conexao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_usuario: user?.id,
            nome: form.nome,
            numero: form.numero.replace(/\D/g, ""),
            status: 'Conectado',
            data_hora: dateTimeSP.slice(0, 16)
          })
        });
      } catch {}
    }
  }, [connectionStatus]);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Conexões WhatsApp" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <motion.div
          className="flex gap-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Card: Quantidade de Conexões */}
          <div
            className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <LinkIcon size={20} className="text-primary-600" />
              </div>
              <h3 className="font-semibold">Quantidade de Conexões</h3>
            </div>
            <p className="text-2xl font-bold">{connections.length}</p>
          </div>
          {/* Card: Conectado/Desconectado */}
          <div
            className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <UserIcon size={20} className="text-primary-600" />
              </div>
              <h3 className="font-semibold">Status</h3>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold">
                {connections.filter(c => c.status === 'Conectado').length}
                <span className="mx-2 text-2xl font-bold text-neutral-400">/</span>
                {connections.filter(c => c.status === 'Desconectado').length}
              </span>
              <span className="text-xs text-neutral-500 mt-1">Conectado / Desconectado</span>
            </div>
          </div>
          {/* Card: Login (Usuário logado) */}
          <div
            className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <UserIcon size={20} className="text-primary-600" />
              </div>
              <h3 className="font-semibold">Login</h3>
            </div>
            <p className="text-2xl font-bold">{user?.username}</p>
            <p className="text-sm text-neutral-500">Usuário logado</p>
          </div>
        </motion.div>

        <div className="mb-4">
          <Button variant="primary" onClick={openAddModal}>
            Adicionar
          </Button>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-100">
              <tr>
                {[
                  "ID",
                  "Nome",
                  "Número",
                  "Status",
                  "Data Conexão",
                  "Ações",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {connections.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    {c.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    {c.nome}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    {c.numero}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    {c.status}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    {c.dataCadastro}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {/* ação de desconectar futura */}}
                        className="text-primary-500 hover:text-primary-700 p-1"
                        title="Desconectar"
                      >
                        <LogOut size={20} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(c.id)}
                        className="text-error-500 hover:text-error-700 p-1"
                        title="Excluir"
                      >
                        <Trash size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-semibold mb-4">
                Nova Conexão WhatsApp
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Nome do WhatsApp
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nome: e.target.value }))
                    }
                    className="europa-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Número do WhatsApp
                  </label>
                  <InputMask
                    mask="+55 11 99999-9999"
                    value={form.numero}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, numero: e.target.value }))
                    }
                    className="europa-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Tipo de WhatsApp
                  </label>
                  <select
                    value={form.integration}
                    onChange={e => setForm(f => ({ ...f, integration: e.target.value }))}
                    className="europa-input w-full"
                  >
                    <option value="WHATSAPP-BAILEYS">WhatsApp</option>
                    <option value="WHATSAPP-BUSINESS">WhatsApp Oficial</option>
                  </select>
                </div>
                {/* Removido campo Nome da Equipe e switch Zap Responder/Disparos Evolution */}
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <Button variant="secondary" onClick={closeAddModal}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Conectando…" : "Conectar"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {isQrModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center"
            >
              <h2 className="text-xl font-semibold mb-4">
                Escaneie o QR Code
              </h2>
              <img
                src={qrImage}
                alt="QR Code"
                className="mx-auto mb-4 max-h-64"
              />
              <Button variant="primary" onClick={handleQrClose}>
                Concluir
              </Button>
            </motion.div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs text-center"
            >
              <h2 className="text-lg font-semibold mb-4">
                Tem certeza que deseja excluir esta conexão?
              </h2>
              <div className="flex justify-center space-x-4">
                <Button variant="secondary" onClick={closeDeleteModal}>
                  Não
                </Button>
                <Button variant="primary" onClick={confirmDelete}>
                  Sim
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {isExternalQrModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center"
            >
              <h2 className="text-xl font-semibold mb-4">
                Escaneie o QR Code do WhatsApp
              </h2>
              {/* Barra de carregamento dos 30s */}
              <div className="w-full h-2 bg-neutral-200 rounded-full mb-2 overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-100"
                  style={{ width: `${qrProgress}%` }}
                />
              </div>
              {/* Status de conexão */}
              <div className="mb-2 min-h-[28px] text-lg font-medium">
                {connectionStatus === "open"
                  ? (
                      countdown !== null
                        ? `Conectado! Fechando em ${countdown}...`
                        : "Conectado!"
                    )
                  : connectionStatus
                    ? "Aguardando conexão..."
                    : "Aguardando conexão..."}
              </div>
              {externalQrBase64 ? (
                <img
                  src={externalQrBase64}
                  alt="QR Code"
                  className="mx-auto mb-4 max-h-64"
                />
              ) : (
                <span>QR Code não disponível.</span>
              )}
              {/* Pairing code abaixo do QR Code */}
              {pairingCode && (
                <div className="mt-2 text-base font-mono text-primary-700">
                  Código de Pareamento: <span className="font-bold">{pairingCode}</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
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

export default ConexaoWhats;
