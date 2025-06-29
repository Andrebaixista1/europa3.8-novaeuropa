import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link as LinkIcon, User as UserIcon, Info } from "lucide-react";
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

const DEPARTAMENTO_API = "https://api.zapresponder.com.br/api/departamento/all";
const DEPARTAMENTO_TOKEN =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2ODQ4OGE3NDUyMDNiMTM3ODYzN2Y5MjgiLCJhcGkiOnRydWUsImlhdCI6MTc0OTY2OTMzMH0.ZjC4M6uxSbEt9iC80AoMAwvWz19K0IY7cy3u8o4rNLQ";

interface Connection {
  id: number;
  nome: string;
  numero: string;
  equipe: string;
  tipo: "Zap Responder" | "Disparos Evolution";
  status: "Conectado" | "Desconectado";
  dataCadastro: string;
  qrCode: string;
}

interface Departamento {
  _id: string;
  nome: string;
  userId: string;
}

const DISPAROS_LIMIT = 1;

const ConexaoWhats: React.FC = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [qrImage, setQrImage] = useState<string>("");
  const [form, setForm] = useState({
    nome: "",
    numero: "+55 11 ",
    equipeId: "",
    isDisparos: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);

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
            equipe: item.equipe,
            tipo:
              item.tipo_conexao === "Disparos Evolution"
                ? "Disparos Evolution"
                : "Zap Responder",
            status: item.status === 1 ? "Conectado" : "Desconectado",
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

  async function fetchDepartamentos() {
    try {
      const res = await fetch(DEPARTAMENTO_API, {
        headers: {
          Authorization: DEPARTAMENTO_TOKEN,
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error("Não foi possível carregar equipes");
      const json = await res.json();
      setDepartamentos(json.departamentos || []);
    } catch (err: any) {
      toast.error(err.message, { autoClose: 3000 });
    }
  }

  useEffect(() => {
    fetchConnections();
    const onFocus = () => fetchConnections();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]);

  const totalDisparos = connections.filter(
    (c) => c.tipo === "Disparos Evolution"
  ).length;

  function openAddModal() {
    fetchDepartamentos();
    setIsModalOpen(true);
  }
  function closeAddModal() {
    setForm({ nome: "", numero: "+55 11 ", equipeId: "", isDisparos: false });
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
    if (form.isDisparos && totalDisparos >= DISPAROS_LIMIT) {
      toast.error("Limite de conexões de disparos acabou", {
        autoClose: 3000,
      });
      return;
    }
    if (!form.equipeId) {
      toast.error("Selecione uma equipe", { autoClose: 3000 });
      return;
    }
    const dept = departamentos.find((d) => d._id === form.equipeId);
    if (!dept) {
      toast.error("Equipe selecionada não encontrada", { autoClose: 3000 });
      return;
    }

    setIsConnecting(true);
    try {
      const payload = {
        id_usuario: user!.id,
        nome: form.nome,
        telefone: form.numero,
        sessionId: form.equipeId,
        imagemId: dept.userId,
        tipo_conexao: form.isDisparos
          ? "Disparos Evolution"
          : "Zap Responder",
        status: 1,
      };
      const res = await fetch(N8N_NEW_CONN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.mensagem || "Erro ao criar conexão");
      }
      const json = await res.json();
      setQrImage(json.qrcode);
      toast.success(json.mensagem, { autoClose: 3000 });
      await fetchConnections();
      openQrModal();
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

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Conexões WhatsApp" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <motion.div
          className="flex gap-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {[
            {
              icon: <LinkIcon size={20} className="text-primary-600" />,
              title: "Quantidade de Conexões",
              value: connections.length,
            },
            {
              icon: <UserIcon size={20} className="text-primary-600" />,
              title: "Número Online",
              value: connections.filter((c) => c.status === "Conectado")
                .length,
            },
            {
              icon: <LinkIcon size={20} className="text-primary-600" />,
              title: (
                <div className="flex items-center">
                  Conexões de Disparos
                  <Info
                    size={16}
                    className="ml-1 text-neutral-500 cursor-pointer"
                    title="Aqui você pode ver quantas conexões de disparos estão ativas e seu limite"
                  />
                </div>
              ),
              value: `${totalDisparos}/${DISPAROS_LIMIT}`,
            },
          ].map((card, i) => (
            <div
              key={i}
              className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  {card.icon}
                </div>
                <h3 className="font-semibold">
                  {card.title as React.ReactNode}
                </h3>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          ))}
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
                  "Equipe",
                  "Tipo Conexão",
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
                    {c.equipe}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    {c.tipo}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    {c.status}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    {c.dataCadastro}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    <button
                      onClick={() => openDeleteModal(c.id)}
                      className="text-error-500 hover:underline"
                    >
                      Excluir
                    </button>
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
                  >
                    <input type="text" className="europa-input w-full" />
                  </InputMask>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Nome da Equipe
                  </label>
                  <select
                    value={form.equipeId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, equipeId: e.target.value }))
                    }
                    className="europa-input w-full"
                  >
                    <option value="">Selecione uma equipe</option>
                    {departamentos.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <span className="text-sm font-medium text-neutral-700">
                    Zap Responder
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, isDisparos: !f.isDisparos }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-primary-600 ${
                      form.isDisparos ? "bg-success-500" : "bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${
                        form.isDisparos ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-neutral-700">
                    Disparos Evolution
                  </span>
                </div>
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
      </div>
    </div>
  );
};

export default ConexaoWhats;
