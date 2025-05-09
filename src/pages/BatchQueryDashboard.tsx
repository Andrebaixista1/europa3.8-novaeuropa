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
  Zap, // Ícone para Higienizar
  Download as DownloadIcon, // Ícone para Download
  Loader2, // Ícone de loading
  CheckCircle, // Ícone de sucesso
  XCircle, // Ícone de erro
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner"; 
import { useAuth } from "../context/AuthContext";

// CORREÇÃO APLICADA AQUI:
// Em desenvolvimento, usa o IP direto. Em produção, usa caminho relativo para o proxy do Vercel funcionar.
const API_BASE = import.meta.env.DEV
  ? "http://177.153.62.236:5678/"
  : ""; // Em produção, o Vercel usará o proxy definido no vercel.json

interface AccountLimits {
  id: number;
  login: string;
  total_loaded: number;
  available_limit: number;
  queries_performed: number;
}

interface HigienizacaoResult {
  Higienizados: number;
  Erros: number;
  Finalizados: number;
  Status: string; // "Finalizado", "Erro", etc.
  Message?: string; // Mensagem de erro detalhada da API
}

interface Lote {
  nome_arquivo: string;
  qtd_linhas: number;
  higienizacao_status?: string; // Novo campo para o status principal da higienização (ex: "Finalizado")
  higienizacao_resultado?: HigienizacaoResult | null; // Para armazenar o objeto de resultado completo
}

interface ActionState {
  [actionKey: string]: { // Chave agora é actionType-fileName
    isLoading: boolean;
    error: string | null;
  };
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
  const [actionStates, setActionStates] = useState<ActionState>({});

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
        headers: { "Content-Type": "application/json" },
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
      const initialLotes = data.map((lote: Omit<Lote, 'higienizacao_status' | 'higienizacao_resultado'>) => ({
        ...lote,
        higienizacao_status: undefined,
        higienizacao_resultado: null,
      }));
      setLotes(initialLotes);
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

  const handleAction = async (actionType: "higienizar" | "download", nomeArquivo: string) => {
    if (!userId) {
      alert("ID do usuário não encontrado.");
      return;
    }
    if (!accountLimits && actionType === "higienizar") {
      alert("Limites da conta não carregados. Tente novamente mais tarde.");
      return;
    }

    const actionKey = `${actionType}-${nomeArquivo}`;
    setActionStates(prev => ({ 
      ...prev, 
      [actionKey]: { isLoading: true, error: null } 
    }));

    try {
      const endpoint = actionType === "higienizar" ? `${API_BASE}/webhook/api/higienizar` : `${API_BASE}/webhook/api/download`;
      const bodyPayload = {
        id_usuario: userId,
        nome_arquivo: nomeArquivo,
        limite_disponivel: accountLimits?.available_limit, 
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(responseText || `Erro ao ${actionType} o arquivo ${nomeArquivo}`);
      }

      if (actionType === "download") {
        // Para download, a API deve retornar o blob diretamente ou um JSON com URL para o blob
        // Este exemplo assume que retorna o blob diretamente.
        const blob = await response.blob(); 
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const originalExtension = nomeArquivo.split(".").pop() || "csv";
        const downloadFileName = `${nomeArquivo.substring(0, nomeArquivo.lastIndexOf(".") || nomeArquivo.length)}.${originalExtension}`;
        a.download = downloadFileName; 
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setActionStates(prev => ({ 
          ...prev, 
          [actionKey]: { isLoading: false, error: null } 
        }));
      } else { // Higienizar
        const resultadoHigienizacao: HigienizacaoResult = JSON.parse(responseText);
        setLotes(prevLotes => 
          prevLotes.map(lote => 
            lote.nome_arquivo === nomeArquivo 
              ? { ...lote, higienizacao_status: resultadoHigienizacao.Status, higienizacao_resultado: resultadoHigienizacao } 
              : lote
          )
        );
        setActionStates(prev => ({ 
          ...prev, 
          [actionKey]: { isLoading: false, error: null } 
        }));
      }

    } catch (error) {
      console.error(`Falha ao ${actionType} arquivo:`, error);
      setActionStates(prev => ({ 
        ...prev, 
        [actionKey]: { isLoading: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
      }));
       if (actionType === "higienizar") {
        setLotes(prevLotes => 
          prevLotes.map(lote => 
            lote.nome_arquivo === nomeArquivo 
              ? { ...lote, higienizacao_status: "Erro", higienizacao_resultado: { Status: "Erro", Message: error instanceof Error ? error.message : "Erro desconhecido", Higienizados: 0, Erros: lote.qtd_linhas, Finalizados: 0 } } 
              : lote
          )
        );
      }
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

  const getStatusLoteDisplay = (lote: Lote) => {
    if (lote.higienizacao_status === "Finalizado") {
      return { text: "Finalizado", color: "text-green-600 bg-green-100" };
    }
    if (lote.higienizacao_status === "Erro") {
        return { text: "Erro na Higienização", color: "text-red-600 bg-red-100" };
    }
    if (accountLimits && lote.qtd_linhas > accountLimits.available_limit) {
      return { text: "Acima do limite", color: "text-red-600 bg-red-100" };
    }
    return { text: "Pendente", color: "text-yellow-600 bg-yellow-100" };
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Consulta em Lote" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-5xl mx-auto grid gap-6">
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
                  >
                    Remover Seleção
                  </Button>
                )}
              </div>
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={handleAddFileAndProcess}
              disabled={!selectedFile || isAddingFile}
              icon={isAddingFile ? <LoadingSpinner size="sm" /> : <PlusCircle size={18} />}
            >
              {isAddingFile ? "Adicionando..." : "Adicionar Arquivo e Iniciar Processamento"}
            </Button>
          </motion.div>

          {lotesError && (
            <motion.div
              className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded relative mt-6"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            >
              <AlertTriangle size={20} className="inline mr-2" />
              <strong className="font-bold">Erro ao carregar lotes: </strong>
              <span className="block sm:inline">{lotesError}</span>
            </motion.div>
          )}

          {isLoadingLotes && !lotesError && (
            <div className="flex justify-center items-center mt-8">
              <LoadingSpinner size="lg" />
              <p className="ml-3 text-neutral-600">Carregando histórico de lotes...</p>
            </div>
          )}

          {!isLoadingLotes && !lotesError && lotes.length === 0 && (
            <motion.div 
              className="text-center text-neutral-500 mt-8 p-6 bg-white border rounded-xl shadow"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              Nenhum lote encontrado. Faça o upload de um arquivo para começar.
            </motion.div>
          )}

          {!isLoadingLotes && lotes.length > 0 && (
            <motion.div
              className="bg-white border border-neutral-200 rounded-xl shadow mt-6 overflow-x-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-xl font-semibold p-6 border-b border-neutral-200">
                Histórico de Lotes
              </h3>
              <table className="w-full min-w-[800px]">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="p-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Nome do Arquivo</th>
                    <th className="p-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Qtd. Linhas</th>
                    <th className="p-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Higienizado / Erro</th>
                    <th className="p-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {lotes.map((lote) => {
                    const statusDisplay = getStatusLoteDisplay(lote);
                    const higienizacaoKey = `higienizar-${lote.nome_arquivo}`;
                    const downloadKey = `download-${lote.nome_arquivo}`;
                    const isHigienizando = actionStates[higienizacaoKey]?.isLoading;
                    const isDownloading = actionStates[downloadKey]?.isLoading;
                    const higienizacaoError = actionStates[higienizacaoKey]?.error;
                    const downloadError = actionStates[downloadKey]?.error;

                    let higienizadoInfo = "-";
                    if (lote.higienizacao_resultado) {
                      if (lote.higienizacao_resultado.Status === "Finalizado") {
                        higienizadoInfo = `${lote.higienizacao_resultado.Higienizados} higienizados, ${lote.higienizacao_resultado.Erros} erros`;
                      } else if (lote.higienizacao_resultado.Status === "Erro") {
                        higienizadoInfo = `Erro: ${lote.higienizacao_resultado.Message || "Detalhes não disponíveis"}`;
                      }
                    }

                    return (
                      <tr key={lote.nome_arquivo}>
                        <td className="p-4 whitespace-nowrap text-sm font-medium text-neutral-900">{lote.nome_arquivo}</td>
                        <td className="p-4 whitespace-nowrap text-sm text-neutral-500">{lote.qtd_linhas}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusDisplay.color}`}>
                            {statusDisplay.text}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-sm text-neutral-500">
                          {isHigienizando ? <LoadingSpinner size="xs" /> : higienizadoInfo}
                          {higienizacaoError && <span className="text-xs text-red-500 block">{higienizacaoError}</span>}
                        </td>
                        <td className="p-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            variant="primary_outline"
                            size="sm"
                            onClick={() => handleAction("higienizar", lote.nome_arquivo)}
                            disabled={isHigienizando || isDownloading || statusDisplay.text === "Acima do limite" || lote.higienizacao_status === "Finalizado"}
                            icon={isHigienizando ? <LoadingSpinner size="xs" /> : <Zap size={16} />}
                          >
                            {isHigienizando ? "Processando..." : "Higienizar"}
                          </Button>
                          <Button
                            variant="secondary_outline"
                            size="sm"
                            onClick={() => handleAction("download", lote.nome_arquivo)}
                            disabled={isDownloading || isHigienizando || lote.higienizacao_status !== "Finalizado"}
                            icon={isDownloading ? <LoadingSpinner size="xs" /> : <DownloadIcon size={16} />}
                          >
                            {isDownloading ? "Baixando..." : "Download"}
                          </Button>
                          {downloadError && <span className="text-xs text-red-500 block">{downloadError}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchQueryDashboard;

