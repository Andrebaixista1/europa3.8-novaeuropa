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

const API_BASE = "https://webhook.sistemavieira.com.br";

interface AccountLimits {
  id: number;
  login: string;
  total_loaded: number;
  available_limit: number;
  queries_performed: number;
}

interface LogLoteData {
  id_log?: number; 
  higienizados: number;
  erros: number;
  total: number; 
  data_hora_registro: string; 
  status_lote: string; 
}

interface LoteFromApiLotes {
    nome_arquivo: string;
    qtd_linhas: number; 
}

interface Lote {
  nome_arquivo: string;
  qtd_linhas: number; 
  log_data?: LogLoteData | null; 
  isLoadingLogData?: boolean;
  logDataError?: string | null;
}

interface ActionState {
  [actionKey: string]: { 
    isLoading: boolean;
    error: string | null;
  };
}

// Colunas esperadas no CSV, conforme especificado pelo usuário em pasted_content_2.txt
const CSV_HEADERS = [
  "numero_beneficio", "numero_documento", "nome", "estado", "pensao", 
  "data_nascimento", "tipo_bloqueio", "data_concessao", "tipo_credito", 
  "limite_cartao_beneficio", "saldo_cartao_beneficio", "situacao_beneficio", 
  "data_final_beneficio", "limite_cartao_consignado", "saldo_cartao_consignado", 
  "saldo_credito_consignado", "saldo_total_maximo", "saldo_total_utilizado", 
  "saldo_total_disponivel", "data_consulta", "data_retorno_consulta", 
  "hora_retorno_consulta", "nome_representante_legal", "banco_desembolso", 
  "agencia_desembolso", "conta_desembolso", "digito_desembolso", 
  "numero_portabilidades","data_hora_registro", 
  "nome_arquivo"
];

const formatDateTimeBrazilian = (dateTimeString?: string): string => {
  if (!dateTimeString || dateTimeString.trim() === "") return "N/A";
  try {
    const normalizedDateTimeString = dateTimeString.replace(" ", "T");
    const date = new Date(normalizedDateTimeString);
    
    if (isNaN(date.getTime())) {
        const parts = dateTimeString.match(/(\d+)/g);
        if (parts && parts.length >= 5) { 
            const year = parseInt(parts[0], 10);
            const monthIndex = parseInt(parts[1], 10) - 1; 
            const day = parseInt(parts[2], 10);
            const hours = parseInt(parts[3], 10);
            const minutes = parseInt(parts[4], 10);
            const parsedDate = new Date(year, monthIndex, day, hours, minutes);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                });
            }
        }
        console.warn("[formatDateTimeBrazilian] Data inválida recebida para formatação:", dateTimeString);
        return "Data inválida"; 
    }
    return date.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch (e) {
    console.error("[formatDateTimeBrazilian] Erro ao formatar data:", dateTimeString, e);
    return dateTimeString; 
  }
};

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
        setAccountLimits(null);
      } else {
        const dataFromApi = JSON.parse(responseText);
        setAccountLimits({
          id: dataFromApi.id,
          login: dataFromApi.login,
          total_loaded: dataFromApi.total_carregado,
          available_limit: dataFromApi.limite_disponivel,
          queries_performed: dataFromApi.consultas_realizada,
        });
      }
    } catch (error) {
      console.error("[fetchAccountLimits] Falha ao buscar limites da conta:", error);
      setLimitError(`Não foi possível carregar os dados de saldo. ${error instanceof Error ? error.message : "Tente novamente mais tarde."}`);
      setAccountLimits(null);
    } finally {
      setIsLoadingLimits(false);
    }
  }, [userId]);

  const fetchLoteLogData = useCallback(async (currentUserId: number, nomeArquivo: string): Promise<LogLoteData | null> => {
    console.log(`[fetchLoteLogData] Iniciando busca de log para: ${nomeArquivo}, ID Usuário: ${currentUserId}`);
    try {
      const response = await fetch(`${API_BASE}/webhook/api/log_lotes`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ id: currentUserId, nome_arquivo: nomeArquivo }), 
      });
      console.log(`[fetchLoteLogData] Resposta da API /log_lotes para ${nomeArquivo} - Status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[fetchLoteLogData] Erro ao buscar log para ${nomeArquivo}: ${response.statusText} - ${errorText}`);
        return null;
      }
      const responseData = await response.json();
      console.log(`[fetchLoteLogData] Dados JSON recebidos para ${nomeArquivo}:`, responseData);
      if (Array.isArray(responseData) && responseData.length > 0) {
        const data = responseData[0];
        return {
          id_log: data.id,
          higienizados: parseInt(String(data.higienizados), 10) || 0,
          erros: parseInt(String(data.erros), 10) || 0,
          total: parseInt(String(data.total), 10) || 0, 
          data_hora_registro: data.data_hora_registro || "", 
          status_lote: data.status_lote || "Indefinido", 
        };
      } else if (!Array.isArray(responseData) && responseData) { // Caso a API retorne um objeto direto e não um array
        const data = responseData;
        return {
            id_log: data.id,
            higienizados: parseInt(String(data.higienizados), 10) || 0,
            erros: parseInt(String(data.erros), 10) || 0,
            total: parseInt(String(data.total), 10) || 0,
            data_hora_registro: data.data_hora_registro || "",
            status_lote: data.status_lote || "Indefinido",
        };
      } else {
        console.warn(`[fetchLoteLogData] Resposta inesperada ou vazia da API /log_lotes para ${nomeArquivo}:`, responseData);
        return null;
      }
    } catch (error) {
      console.error(`[fetchLoteLogData] Falha ao buscar dados de log para ${nomeArquivo}:`, error);
      return null;
    }
  }, []);

  const fetchLotes = useCallback(async () => {
    if (!userId) {
      setIsLoadingLotes(false);
      setLotesError("ID do usuário não encontrado para buscar os lotes.");
      return;
    }
    console.log("[fetchLotes] Iniciando busca de lotes...");
    setIsLoadingLotes(true);
    setLotesError(null);
    try {
      const responseLotes = await fetch(`${API_BASE}/webhook/api/lotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      console.log(`[fetchLotes] Resposta da API /lotes - Status: ${responseLotes.status}`);
      if (!responseLotes.ok) {
        const errorData = await responseLotes.text();
        throw new Error(`Erro ao buscar lotes: ${responseLotes.statusText} - ${errorData}`);
      }
      const lotesBaseFromApi: LoteFromApiLotes[] = await responseLotes.json();
      console.log("[fetchLotes] Lotes base recebidos da API /api/lotes:", lotesBaseFromApi);

      if (!Array.isArray(lotesBaseFromApi)) {
          console.error("[fetchLotes] Resposta de /api/lotes não é um array:", lotesBaseFromApi);
          setLotes([]);
          setIsLoadingLotes(false);
          setLotesError("Formato inesperado da resposta da API de lotes.");
          return;
      }

      if (lotesBaseFromApi.length === 0) {
        console.log("[fetchLotes] Nenhum lote base encontrado.");
        setLotes([]);
        setIsLoadingLotes(false);
        return;
      }

      console.log(`[fetchLotes] Mapeando ${lotesBaseFromApi.length} lotes base para buscar logs...`);
      const lotesCompletosPromises = lotesBaseFromApi.map(async (loteBase, index) => {
        console.log(`[fetchLotes] Iteração ${index + 1}: Preparando para buscar log do lote: ${loteBase.nome_arquivo}`);
        const logData = await fetchLoteLogData(userId, loteBase.nome_arquivo);
        console.log(`[fetchLotes] Iteração ${index + 1}: Log recebido para ${loteBase.nome_arquivo}:`, logData);
        return {
          nome_arquivo: loteBase.nome_arquivo,
          qtd_linhas: loteBase.qtd_linhas || 0, 
          log_data: logData,
          isLoadingLogData: false,
          logDataError: logData ? null : `Falha ao carregar log para ${loteBase.nome_arquivo}`,
        };
      });

      const lotesCompletos = await Promise.all(lotesCompletosPromises);
      console.log("[fetchLotes] Todos os logs buscados. Lotes completos:", lotesCompletos);
      setLotes(lotesCompletos);

    } catch (error) {
      console.error("[fetchLotes] Falha ao buscar lotes:", error);
      setLotesError(`Não foi possível carregar os dados dos lotes. ${error instanceof Error ? error.message : "Tente novamente mais tarde."}`);
      setLotes([]);
    } finally {
      setIsLoadingLotes(false); 
      console.log("[fetchLotes] Busca de lotes finalizada.");
    }
  }, [userId, fetchLoteLogData]);

  const refreshAllData = useCallback(async () => {
    console.log("[refreshAllData] Iniciando atualização de todos os dados...");
    await fetchAccountLimits();
    await fetchLotes();
    console.log("[refreshAllData] Atualização de todos os dados finalizada.");
  }, [fetchAccountLimits, fetchLotes]);

  useEffect(() => {
    if (userId) {
      console.log("[useEffect] ID do usuário detectado, iniciando refreshAllData.");
      refreshAllData();
    }
  }, [userId, refreshAllData]);

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
      console.log("[handleAddFileAndProcess] Lote criado com sucesso, atualizando todos os dados...");
      await refreshAllData();
    } catch (error) {
      console.error("[handleAddFileAndProcess] Erro ao adicionar arquivo e processar:", error);
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

  const convertJsonToCsv = (jsonData: any[]): string => {
    if (!jsonData || jsonData.length === 0) {
      return "";
    }
    const headers = CSV_HEADERS; // CSV_HEADERS deve estar definido no escopo superior
    const csvRows = [];
    csvRows.push(headers.map(header => `"${String(header).replace(/"/g, '""')}"`).join(";"));

    const monetaryColumns = [
      "limite_cartao_beneficio", "saldo_cartao_beneficio", 
      "limite_cartao_consignado", "saldo_cartao_consignado", "saldo_credito_consignado", 
      "saldo_total_maximo", "saldo_total_utilizado", "saldo_total_disponivel"
    ];

    const translations: { [key: string]: { [key: string]: string } } = {
      pensao: {
        "not_payer": "Não Pagador",
        "payer": "Pagador",
        "benefit": "Benefício",
        "null": "Não Informado"
      },
      tipo_bloqueio: {
        "blocked_by_benefitiary": "Bloqueado pelo Beneficiário",
        "not_blocked": "Não Bloqueado",
        "blocked_in_concession": "Bloqueado em Concessão",
        "blocked_by_tbm": "Bloqueado por TBM",
        "null": "Não Informado"
      },
      tipo_credito: {
        "magnetic_card": "Cartão Magnético",
        "checking_account": "Conta Corrente",
        "null": "Não Informado"
      },
      situacao_beneficio: {
        "blocked": "Bloqueado",
        "elegible": "Elegível",
        "inelegible": "Inelegível",
        "null": "Não Informado"
      }
    };

    for (const row of jsonData) {
      const values = headers.map(header => {
        let currentValue = row[header];
        let finalValAsString: string;

        // Etapa 1: Formatação Monetária (se aplicável)
        if (monetaryColumns.includes(header)) {
          const originalStr = String(row[header]);
          if (row[header] !== null && row[header] !== undefined && !isNaN(parseFloat(originalStr)) && isFinite(Number(row[header]))) {
            currentValue = originalStr.replace('.', ',');
          }
        }
        
        // Etapa 2: Tradução (se aplicável)
        const valueKeyForTranslation = currentValue === null ? "null" : String(currentValue);

        if (translations[header as keyof typeof translations] && 
            translations[header as keyof typeof translations].hasOwnProperty(valueKeyForTranslation)) {
          finalValAsString = translations[header as keyof typeof translations][valueKeyForTranslation];
        } else {
          finalValAsString = currentValue === null || currentValue === undefined ? "" : String(currentValue);
        }
        
        // Etapa 3: Escape de aspas duplas e formatação final para CSV
        const escaped = finalValAsString.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(";"));
    }
    return csvRows.join("\n");
  };


  const handleAction = async (actionType: "higienizar" | "download", nomeArquivo: string) => {
    if (!userId) {
      alert("ID do usuário não encontrado.");
      return;
    }

    const actionKey = `${actionType}-${nomeArquivo}`;
    setActionStates(prev => ({ 
      ...prev, 
      [actionKey]: { isLoading: true, error: null } 
    }));

    try {
      const endpoint = actionType === "higienizar" ? `${API_BASE}/webhook/api/higienizar` : `${API_BASE}/webhook/api/download`;
      const loteAtual = lotes.find(l => l.nome_arquivo === nomeArquivo);
      
      let bodyPayload: any;

      if (actionType === "higienizar") {
        if (!accountLimits || !loteAtual?.log_data || (loteAtual.log_data.total > accountLimits.available_limit)) {
            const errorMessage = !accountLimits ? "Limites da conta não carregados." 
                               : !loteAtual?.log_data ? "Dados do lote (log) incompletos para verificar limite."
                               : "Não é possível higienizar: Quantidade de linhas do lote (log) excede o limite disponível.";
            alert(errorMessage);
            setActionStates(prev => ({ ...prev, [actionKey]: { isLoading: false, error: errorMessage } }));
            return;
        }
        bodyPayload = {
          id_usuario: userId, 
          nome_arquivo: nomeArquivo,
          limite_disponivel: accountLimits?.available_limit, 
        };
      } else { // download
        bodyPayload = {
          id: userId, // API /api/download espera 'id' e não 'id_usuario'
          nome_arquivo: nomeArquivo,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const responseText = await response.text(); 
        throw new Error(responseText || `Erro ao ${actionType} o arquivo ${nomeArquivo}`);
      }

      if (actionType === "download") {
        const jsonData = await response.json(); // Espera-se que a API retorne um JSON array
        const csvData = convertJsonToCsv(jsonData);
        const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' }); // Adiciona BOM para UTF-8 e define o charset
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        // Remove a extensão original e adiciona .csv
        const downloadFileName = `${nomeArquivo.substring(0, nomeArquivo.lastIndexOf(".") || nomeArquivo.length)}.csv`;
        a.download = downloadFileName; 
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setActionStates(prev => ({ ...prev, [actionKey]: { isLoading: false, error: null } }));
      } else { // Higienizar
        console.log(`[handleAction] Ação ${actionType} para ${nomeArquivo} bem-sucedida, atualizando todos os dados...`);
        await refreshAllData();
        setActionStates(prev => ({ ...prev, [actionKey]: { isLoading: false, error: null } }));
      }

    } catch (error) {
      console.error(`[handleAction] Falha ao ${actionType} arquivo:`, error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      setActionStates(prev => ({ 
        ...prev, 
        [actionKey]: { isLoading: false, error: errorMessage }
      }));
      // Mesmo em caso de erro na higienização, atualiza os dados para refletir qualquer mudança parcial ou estado de erro.
      if (actionType === "higienizar") {
        console.log(`[handleAction] Erro na ação ${actionType} para ${nomeArquivo}, atualizando todos os dados...`);
        await refreshAllData();
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
      valueKey: "queries_performed", // Corrigido para corresponder à interface AccountLimits
      subtitle: "Total consultas",
    },
    {
      icon: <UserIcon size={20} className="text-primary-600" />,
      title: "Login",
      value: user?.username ?? "N/A", // Usar user.username se disponível
      subtitle: "Usuário logado",
    },
  ];

  const getStatusLoteDisplay = (lote: Lote) => {
    if (lote.isLoadingLogData) {
      return { text: "Carregando...", color: "text-neutral-500 bg-neutral-100" };
    }
    if (lote.logDataError && !lote.log_data) { 
      return { text: "Erro Log", color: "text-red-600 bg-red-100" };
    }
    if (lote.log_data && lote.log_data.status_lote) {
      const statusLog = lote.log_data.status_lote.toLowerCase();
      if (statusLog === "finalizado") {
        return { text: "Finalizado", color: "text-green-600 bg-green-100" };
      }
      if (statusLog === "pendente") {
        return { text: "Pendente", color: "text-yellow-600 bg-yellow-100" };
      }
      if (statusLog === "processando") {
        return { text: "Processando...", color: "text-blue-600 bg-blue-100" };
      }
      if (statusLog.includes("erro")) {
        return { text: "Erro", color: "text-red-600 bg-red-100" };
      }
      return { text: lote.log_data.status_lote || "Indefinido", color: "text-neutral-500 bg-neutral-100" };
    }
    return { text: "Indisponível", color: "text-neutral-500 bg-neutral-100" };
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Consulta em Lote" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-7xl mx-auto grid gap-6">
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

          {/* Seção de Upload de Arquivos */}
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
                    Remover
                  </Button>
                )}
              </div>
            </div>
            {selectedFile && (
              <div className="text-center">
                <Button
                  onClick={handleAddFileAndProcess}
                  disabled={isAddingFile || !selectedFile}
                  isLoading={isAddingFile}
                  icon={isAddingFile ? undefined : <PlusCircle size={18} />} 
                  className="w-full sm:w-auto"
                >
                  {isAddingFile ? "Adicionando..." : "Adicionar Arquivo e Processar"}
                </Button>
              </div>
            )}
          </motion.div>

          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-xl font-semibold text-neutral-800 mb-4">Meus Lotes</h2>
            {isLoadingLotes && <div className="text-center p-4"><LoadingSpinner /> Carregando lista de lotes...</div>}
            {lotesError && <div className="text-center p-4 text-red-500 bg-red-50 rounded-md">{lotesError}</div>}
            {!isLoadingLotes && !lotesError && lotes.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed border-neutral-300 rounded-lg bg-neutral-100 mt-4">
                <FileText size={48} className="mx-auto text-neutral-400 mb-4" />
                <h3 className="text-xl font-semibold text-neutral-700 mb-2">Sem Lotes Higienizados</h3>
                <p className="text-neutral-500">Nenhum lote foi enviado para higienização ainda. Utilize a seção de upload acima para adicionar arquivos.</p>
              </div>
            )}
            {!isLoadingLotes && !lotesError && lotes.length > 0 && (
              <div className="overflow-x-auto bg-white border border-neutral-200 rounded-xl shadow">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Nome do Arquivo</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Qtd. Linhas</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Higienizado / Erro</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Data Criação</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {lotes.map((lote) => {
                      const statusDisplay = getStatusLoteDisplay(lote);
                      const isLoadingHigienizar = actionStates[`higienizar-${lote.nome_arquivo}`]?.isLoading;
                      const isLoadingDownload = actionStates[`download-${lote.nome_arquivo}`]?.isLoading;
                      const isFinalizado = lote.log_data?.status_lote?.toLowerCase() === "finalizado";
                      const higienizarError = actionStates[`higienizar-${lote.nome_arquivo}`]?.error;
                      const downloadError = actionStates[`download-${lote.nome_arquivo}`]?.error;

                      return (
                        <tr key={lote.nome_arquivo} className="hover:bg-neutral-100 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800">{lote.nome_arquivo}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusDisplay.color}`}>
                              {statusDisplay.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 text-center">{lote.qtd_linhas ?? "N/A"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 text-center">
                            {lote.log_data ? `${lote.log_data.higienizados} / ${lote.log_data.erros}` : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                            {formatDateTimeBrazilian(lote.log_data?.data_hora_registro)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1 flex items-center">
                            <button
                              onClick={() => handleAction("higienizar", lote.nome_arquivo)}
                              disabled={isLoadingHigienizar || isFinalizado || !!higienizarError}
                              className="p-1.5 rounded text-neutral-500 hover:bg-neutral-200 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 transition-colors"
                              title={isFinalizado ? "Lote já finalizado" : (higienizarError || "Higienizar Lote")}
                            >
                              {isLoadingHigienizar ? <Loader2 className="animate-spin h-5 w-5 text-primary-600" /> : <Zap size={18} />}
                            </button>
                            <button
                              onClick={() => handleAction("download", lote.nome_arquivo)}
                              disabled={isLoadingDownload || !isFinalizado || !!downloadError}
                              className="p-1.5 rounded text-neutral-500 hover:bg-neutral-200 hover:text-success-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-success-500 transition-colors"
                              title={!isFinalizado ? "Download disponível após finalização" : (downloadError || "Download do Lote CSV")}
                            >
                              {isLoadingDownload ? <Loader2 className="animate-spin h-5 w-5 text-success-600" /> : <DownloadIcon size={18} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BatchQueryDashboard;

