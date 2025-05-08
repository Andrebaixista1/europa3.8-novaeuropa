import React, { useState, useEffect, ChangeEvent, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  DollarSign,
  Activity,
  User as UserIcon,
  Upload,
  FileText,
  Trash2,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext"; // Alterado para usar o AuthContext real

const API_BASE = "http://177.153.62.236:5678/";

interface AccountLimits {
  id: number;
  login: string;
  total_loaded: number; 
  available_limit: number; 
  queries_performed: number; 
}

interface Lote {
  nome_arquivo: string;
  qtd_linhas: number;
  status_api: string;
}

const BatchQueryDashboard: React.FC = () => {
  const { user } = useAuth(); 
  const userId = user?.id;

  const [accountLimits, setAccountLimits] = useState<AccountLimits | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isLoadingLimits, setIsLoadingLimits] = useState(true);
  const [isLoadingLotes, setIsLoadingLotes] = useState(true);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [lotesError, setLotesError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAccountLimits = useCallback(async () => {
    if (!userId) {
      setIsLoadingLimits(false);
      setLimitError("ID do usuário não encontrado. Verifique se está logado.");
      return;
    }
    setIsLoadingLimits(true);
    setLimitError(null);
    try {
      const response = await fetch(`${API_BASE}/webhook/api/saldo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Adicionado Content-Type JSON
        body: JSON.stringify({ id: userId }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Erro ao buscar saldo: ${response.statusText} - ${responseText || "Sem corpo de erro"}`);
      }

      if (!responseText) {
        console.warn("API de saldo retornou uma resposta vazia.");
        setAccountLimits(null);
      } else {
        try {
          const dataFromApi = JSON.parse(responseText);
          setAccountLimits({
            id: dataFromApi.id,
            login: dataFromApi.login,
            total_loaded: dataFromApi.total_carregado, 
            available_limit: dataFromApi.limite_disponivel, 
            queries_performed: dataFromApi.consultas_realizada, 
          }); 
        } catch (parseError) {
          console.error("Falha ao fazer parse do JSON da API de saldo:", parseError);
          throw new Error(`Falha ao processar resposta do saldo: ${parseError instanceof Error ? parseError.message : "Formato inválido."}`);
        }
      }

    } catch (error) {
      console.error("Falha ao buscar limites da conta:", error);
      setLimitError(`Não foi possível carregar os dados de saldo. ${error instanceof Error ? error.message : "Tente novamente mais tarde."}`);
      setAccountLimits(null);
    } finally {
      setIsLoadingLimits(false);
    }
  }, [userId]);

  const fetchLotes = useCallback(async () => {
    if (!userId) {
      setIsLoadingLotes(false);
      setLotesError("ID do usuário não encontrado para buscar os lotes.");
      return;
    }
    setIsLoadingLotes(true);
    setLotesError(null);
    try {
      const response = await fetch(`${API_BASE}/webhook/api/lotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao buscar lotes: ${response.statusText} - ${errorData}`);
      }
      const data = await response.json();
      setLotes(data);
    } catch (error) {
      console.error("Falha ao buscar lotes:", error);
      setLotesError(`Não foi possível carregar os dados dos lotes. ${error instanceof Error ? error.message : "Tente novamente mais tarde."}`);
    } finally {
      setIsLoadingLotes(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchAccountLimits();
      fetchLotes();
    }
  }, [userId, fetchAccountLimits, fetchLotes]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleAddFileAndProcess = async () => {
    if (!selectedFile || !userId) {
      alert("Selecione um arquivo e certifique-se de que o ID do usuário está disponível.");
      return;
    }
    setIsAddingFile(true);
    const formData = new FormData();
    formData.append("id", userId.toString());
    formData.append("file", selectedFile);

    try {
      const responseCriaLote = await fetch(`${API_BASE}/webhook/api/cria-lote`, {
        method: "POST",
        body: formData,
      });

      if (!responseCriaLote.ok) {
        const errorData = await responseCriaLote.text();
        throw new Error(`Erro ao criar lote: ${responseCriaLote.statusText} - ${errorData}`);
      }
      
      await fetchLotes();

    } catch (error) {
      console.error("Erro ao adicionar arquivo e processar:", error);
      alert(`Falha ao adicionar arquivo: ${error instanceof Error ? error.message : "Tente novamente."}`);
    } finally {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsAddingFile(false);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const cardData = [
    {
      icon: <DollarSign size={20} className="text-primary-600" />,
      title: "Total Carregado",
      valueKey: "total_loaded", 
      subtitle: "Créditos carregados",
    },
    {
      icon: <CreditCard size={20} className="text-primary-600" />,
      title: "Disponível",
      valueKey: "available_limit",
      subtitle: "Créditos disponíveis",
    },
    {
      icon: <Activity size={20} className="text-primary-600" />,
      title: "Consultas",
      valueKey: "queries_performed",
      subtitle: "Total consultas",
    },
    {
      icon: <UserIcon size={20} className="text-primary-600" />,
      title: "Login",
      value: user?.username ?? "N/A", 
      subtitle: "Usuário logado",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Consulta em Lote" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto grid gap-6">
          {limitError && (
            <motion.div 
              className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded relative mb-4"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            >
              <AlertTriangle size={20} className="inline mr-2" />
              <strong className="font-bold">Erro no Saldo: </strong>
              <span className="block sm:inline">{limitError}</span>
            </motion.div>
          )}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ staggerChildren: 0.1 }}
          >
            {cardData.map((card, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary-100 rounded-lg">{card.icon}</div>
                  <h3 className="font-semibold text-neutral-700">{card.title}</h3>
                </div>
                <p className="text-3xl font-bold text-neutral-900">
                  {isLoadingLimits && card.title !== "Login" ? (
                    <LoadingSpinner size="sm" />
                  ) : card.valueKey && accountLimits ? (
                    accountLimits[card.valueKey as keyof AccountLimits] ?? "N/A"
                  ) : card.title === "Login" ? (
                    card.value
                  ) : (
                    "N/A"
                  )}
                </p>
                <p className="text-sm text-neutral-500">{card.subtitle}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="bg-white border border-neutral-200 rounded-xl shadow p-8 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-semibold text-center mb-6">
              Upload de Arquivos para Consulta em Lote
            </h2>
            <p className="text-neutral-600 text-center mb-6">
              Selecione arquivos CSV ou Excel. Após selecionar um arquivo, clique em "Adicionar Arquivo".
            </p>
            
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center bg-neutral-50 mb-6">
              <div className="mb-4 flex justify-center">
                <Upload size={40} className="text-primary-500" />
              </div>
              <p className="mb-4 text-neutral-600">
                {selectedFile ? 
                  `Arquivo selecionado: ${selectedFile.name}` : 
                  "Arraste e solte seu arquivo aqui, ou clique para procurar"
                }
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                <input
                  type="file"
                  id="fileUpload"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={handleFileChange}
                  disabled={isAddingFile}
                />
                <label htmlFor="fileUpload" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    className="cursor-pointer w-full"
                    icon={<FileText size={18} />}
                    disabled={isAddingFile}
                    onClick={() => fileInputRef.current?.click()} 
                  >
                    Procurar Arquivos
                  </Button>
                </label>
                {selectedFile && (
                  <Button
                    variant="danger_outline"
                    onClick={handleRemoveSelectedFile}
                    disabled={isAddingFile}
                    icon={<Trash2 size={18} />}
                    className="w-full sm:w-auto"
                  >
                    Remover Seleção
                  </Button>
                )}
              </div>
            </div>

            {selectedFile && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="primary"
                  onClick={handleAddFileAndProcess}
                  disabled={isAddingFile || !selectedFile}
                  icon={isAddingFile ? <LoadingSpinner size="sm" /> : <PlusCircle size={18} />}
                  className="w-full sm:w-auto"
                >
                  {isAddingFile ? "Adicionando..." : "Adicionar Arquivo"}
                </Button>
              </div>
            )}
          </motion.div>

          <motion.div
            className="bg-white border border-neutral-200 rounded-xl shadow p-8 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-xl font-semibold mb-4 text-neutral-700">Histórico de Lotes</h3>
            {lotesError && (
                <div className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded relative mb-2">
                    <AlertTriangle size={18} className="inline mr-1" /> {lotesError}
                </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Nome do Arquivo</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Qtd. Linhas</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status API</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {isLoadingLotes && (
                    <tr><td colSpan={3} className="text-center py-4"><LoadingSpinner /> Carregando lotes...</td></tr>
                  )}
                  {!isLoadingLotes && !lotesError && lotes.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-4">Nenhum lote encontrado.</td></tr>
                  )}
                  {!isLoadingLotes && !lotesError && lotes.map((lote, index) => (
                    <tr key={`${lote.nome_arquivo}-${index}`}> 
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{lote.nome_arquivo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{lote.qtd_linhas}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{lote.status_api}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BatchQueryDashboard;

