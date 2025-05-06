import React, { useState, useEffect, ChangeEvent, useRef } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  DollarSign,
  Activity,
  User as UserIcon,
  Upload,
  FileText,
  Trash2,
  Zap, // Icon for 'Higienizar' in table
  PlusCircle, // Icon for 'Adicionar'
  AlertTriangle, // For warnings or errors
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader"; // Assuming this path is correct
import Button from "../components/Button"; // Assuming this path is correct
import LoadingSpinner from "../components/LoadingSpinner"; // Assuming this path is correct
// import { useAuth } from "../context/AuthContext"; // Production: use real AuthContext

// Mock useAuth as per previous setup, ensure user.id is available
const useAuth = () => ({
  user: { id: 1, username: "andrefelipe" }, // Mock user data, ID is 1
});

const API_BASE = "http://177.153.62.236:5678/"; // As per pasted_content_3.txt

interface AccountLimits {
  id: number;
  login: string;
  total_loaded: number; // Corresponds to total_carregado
  available_limit: number; // Corresponds to limite_disponivel
  queries_performed: number; // Corresponds to consultas_realizada
}

interface FileToProcess {
  id: string; // Unique ID for each file
  file: File;
  name: string;
  lineCount: number;
  status: "pending" | "processing" | "higienizado" | "error";
}

const BatchQueryDashboard: React.FC = () => {
  const { user } = useAuth();
  const [accountLimits, setAccountLimits] = useState<AccountLimits | null>(null);
  const [isLoadingLimits, setIsLoadingLimits] = useState(true);
  const [limitError, setLimitError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filesToProcess, setFilesToProcess] = useState<FileToProcess[]>([]);
  const [isAddingFile, setIsAddingFile] = useState(false); // For 'Adicionar' button loading state
  const fileInputRef = useRef<HTMLInputElement>(null); // To reset file input

  // Fetch account limits from API
  useEffect(() => {
    if (!user || !user.id) {
      setIsLoadingLimits(false);
      setLimitError("ID do usuário não encontrado para buscar o saldo.");
      return;
    }

    const fetchAccountLimits = async () => {
      setIsLoadingLimits(true);
      setLimitError(null);
      try {
        const response = await fetch(`${API_BASE}/webhook/api/saldo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user.id }),
        });
        if (!response.ok) {
          throw new Error(`Erro ao buscar saldo: ${response.statusText}`);
        }
        const data = await response.json();
        setAccountLimits({
          id: data.id,
          login: data.login,
          total_loaded: data.total_carregado,
          available_limit: data.limite_disponivel,
          queries_performed: data.consultas_realizada,
        });
      } catch (error) {
        console.error("Falha ao buscar limites da conta:", error);
        setLimitError("Não foi possível carregar os dados de saldo. Tente novamente mais tarde.");
        // Fallback to mock data if API fails, or handle as critical error
        // setAccountLimits({ id: user.id, login: user.username, total_loaded: 0, available_limit: 0, queries_performed: 0 });
      } finally {
        setIsLoadingLimits(false);
      }
    };

    fetchAccountLimits();
  }, [user]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      if (filesToProcess.length < 5) {
        setSelectedFile(event.target.files[0]);
      } else {
        alert("Você pode adicionar no máximo 5 arquivos.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setSelectedFile(null);
      }
    }
  };

  const countLines = async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (file.type === "text/csv") {
          const lines = text.split('\n');
          // Adjust for potential empty last line if file ends with newline
          resolve(lines[lines.length - 1] === '' ? lines.length - 1 : lines.length);
        } else {
          // For Excel (xlsx, xls), actual parsing is complex client-side without a library.
          // Simulating line count for non-CSV or as a fallback.
          console.warn("Contagem de linhas para arquivos não CSV é simulada.")
          resolve(Math.floor(Math.random() * (500 - 20 + 1)) + 20); // Simulated count
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleAddFile = async () => {
    if (!selectedFile) return;
    if (filesToProcess.length >= 5) {
      alert("Limite de 5 arquivos atingido.");
      return;
    }

    setIsAddingFile(true);
    try {
      const lineCount = await countLines(selectedFile);
      const newFile: FileToProcess = {
        id: Date.now().toString() + "-" + selectedFile.name, // Simple unique ID
        file: selectedFile,
        name: selectedFile.name,
        lineCount: lineCount,
        status: "pending",
      };
      setFilesToProcess(prevFiles => [...prevFiles, newFile]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear file input
      }
    } catch (error) {
      console.error("Erro ao contar linhas ou adicionar arquivo:", error);
      alert("Erro ao processar o arquivo. Tente novamente.");
    } finally {
      setIsAddingFile(false);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFileFromList = (fileId: string) => {
    setFilesToProcess(prevFiles => prevFiles.filter(f => f.id !== fileId));
  };

  const handleHigienizarFileInList = async (fileId: string) => {
    setFilesToProcess(prevFiles =>
      prevFiles.map(f => (f.id === fileId ? { ...f, status: "processing" } : f))
    );

    // Simulate higienização process
    await new Promise(resolve => setTimeout(resolve, 1500));

    setFilesToProcess(prevFiles =>
      prevFiles.map(f => (f.id === fileId ? { ...f, status: "higienizado" } : f))
    );
    // In a real scenario, you might re-count lines or perform other operations.
  };

  const cardData = [
    {
      icon: <DollarSign size={20} className="text-primary-600" />,
      title: "Total Carregado",
      value: accountLimits?.total_loaded ?? (isLoadingLimits ? "..." : "N/A"),
      subtitle: "Créditos carregados",
    },
    {
      icon: <CreditCard size={20} className="text-primary-600" />,
      title: "Disponível",
      value: accountLimits?.available_limit ?? (isLoadingLimits ? "..." : "N/A"),
      subtitle: "Créditos disponíveis",
    },
    {
      icon: <Activity size={20} className="text-primary-600" />,
      title: "Consultas",
      value: accountLimits?.queries_performed ?? (isLoadingLimits ? "..." : "N/A"),
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
          {/* CARDS DE SALDO */}
          {limitError && (
            <motion.div 
              className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded relative mb-4"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            >
              <strong className="font-bold">Erro: </strong>
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
                  {isLoadingLimits && card.value === "..." ? <LoadingSpinner size="sm" /> : card.value}
                </p>
                <p className="text-sm text-neutral-500">{card.subtitle}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* SEÇÃO DE UPLOAD DE ARQUIVO */}
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
              Carregue até 5 arquivos CSV ou Excel. Após selecionar um arquivo, clique em "Adicionar Arquivo".
            </p>
            
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center bg-neutral-50 mb-6">
              <div className="mb-4 flex justify-center">
                <Upload size={40} className={`text-primary-500 ${filesToProcess.length >= 5 ? 'text-neutral-400' : ''}`} />
              </div>
              <p className="mb-4 text-neutral-600">
                {selectedFile ? 
                  `Arquivo selecionado: ${selectedFile.name}` : 
                  (filesToProcess.length >= 5 ? "Limite de 5 arquivos atingido." : "Arraste e solte seu arquivo aqui, ou clique para procurar")
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
                  disabled={isAddingFile || filesToProcess.length >= 5}
                />
                <label htmlFor="fileUpload" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    className="cursor-pointer w-full"
                    icon={<FileText size={18} />}
                    disabled={isAddingFile || filesToProcess.length >= 5}
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

            {selectedFile && filesToProcess.length < 5 && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="primary"
                  onClick={handleAddFile}
                  disabled={isAddingFile || !selectedFile}
                  icon={isAddingFile ? <LoadingSpinner size="sm" /> : <PlusCircle size={18} />}
                  className="w-full sm:w-auto"
                >
                  {isAddingFile ? "Adicionando..." : "Adicionar Arquivo"}
                </Button>
              </div>
            )}
             {filesToProcess.length >= 5 && (
                <p className="text-center text-warning-600 mt-4">Você atingiu o limite de 5 arquivos.</p>
            )}
          </motion.div>

          {/* TABELA DE ARQUIVOS ADICIONADOS */}
          {filesToProcess.length > 0 && (
            <motion.div
              className="bg-white border border-neutral-200 rounded-xl shadow p-8 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xl font-semibold mb-4 text-neutral-700">Arquivos Adicionados ({filesToProcess.length}/5)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Nome do Arquivo</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Qtd. Linhas</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {filesToProcess.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{item.lineCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {item.status === "pending" && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendente</span>}
                          {item.status === "processing" && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Processando...</span>}
                          {item.status === "higienizado" && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Higienizado</span>}
                          {item.status === "error" && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Erro</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button 
                            variant="icon" 
                            size="sm" 
                            onClick={() => handleHigienizarFileInList(item.id)} 
                            disabled={item.status === "processing" || item.status === "higienizado"}
                            title="Higienizar"
                          >
                            <Zap size={16} />
                          </Button>
                          <Button 
                            variant="icon_danger" 
                            size="sm" 
                            onClick={() => handleRemoveFileFromList(item.id)} 
                            disabled={item.status === "processing"}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchQueryDashboard;

