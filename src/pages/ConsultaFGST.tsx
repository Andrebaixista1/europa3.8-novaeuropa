import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  CreditCard,
  DollarSign,
  Activity,
  User as UserIcon,
  Calendar,
  FileText,
  Clock,
} from "lucide-react";
import InputMask from "react-input-mask";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

export const API_BASE = 'https://n8n.sistemavieira.com.br/webhook'; // em prod ficará vazio → usa path relativo e o vercel.json proxya

interface FormErrors {
  nome?: string;
  cpf?: string;
}

interface AccountLimits {
  id: number;
  login: string;
  total_loaded: number;
  available_limit: number;
  queries_performed: number;
}

interface Parcela {
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: number;
}

interface FGTSResponse {
  nomeCliente: string;
  cpfCliente: string;
  statusGeral: string;
  dataProposta: string;
  valorTotalSimulado: number;
  valorLiquidoDisponivel: number;
  custoTotalContrato: number;
  parcelas: Parcela[];
}

const ConsultaFGTS: React.FC = () => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSearching, setIsSearching] = useState(false);
  
  const [accountLimits, setAccountLimits] = useState<AccountLimits | null>(null);
  const [isLoadingLimits, setIsLoadingLimits] = useState(false);
  const [resultData, setResultData] = useState<FGTSResponse | null>(null);

  // Função para buscar saldo do usuário
  const fetchUserBalance = async () => {
    if (!user) return;
    
    setIsLoadingLimits(true);
    
    try {
      // Fazer a chamada real à API de saldo
      const response = await fetch(`${API_BASE}/api/saldo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user?.id || '123', // ID do usuário ou valor padrão para teste
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar saldo: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data) {
        console.log("Dados de saldo recebidos:", data);
        
        // Mapeando os campos da API para os campos usados no front-end
        setAccountLimits({
          id: data.id || 1,
          login: data.login || user.username || 'andrefelipe',
          // Usando os nomes de campos corretos da API
          total_loaded: data.total_carregado || 0,
          available_limit: data.limite_disponivel || 0,
          queries_performed: data.consultas_realizada || 0
        });
      }
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
      toast.error("Erro ao atualizar saldo", { autoClose: 3000 });
    } finally {
      setIsLoadingLimits(false);
    }
  };

  // Buscar saldo ao carregar a página
  useEffect(() => {
    fetchUserBalance();
  }, [user]);

  const validateCPF = (v: string) => v.replace(/[^\d]/g, "").length === 11;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validações
    const newErr: FormErrors = {};
    if (!nome.trim()) newErr.nome = "Nome é obrigatório";
    if (!validateCPF(cpf)) newErr.cpf = "CPF inválido";
    setErrors(newErr);
    if (Object.keys(newErr).length) return;

    setIsSearching(true);
    setResultData(null);

    // Preparar payload com nome em maiúsculo e CPF sem pontuação
    const payload = {
      id: user?.id || '123', // ID do usuário ou valor padrão para teste
      nome: nome.toUpperCase(), // Convertendo nome para maiúsculo
      cpf: cpf.replace(/[^\d]/g, ""), // Removendo pontos e traços do CPF
      limite_disponivel: accountLimits?.available_limit.toString() || '1000' // Valor do limite disponível
    };

    // Determinar endpoint com base no estado do switch
    const endpoint = isEnabled ? '/api/consulta-fgts-online' : '/api/consulta-fgts-offline';

    try {
      // Exibir no console.log conforme solicitado
      console.log(`Enviando dados para ${endpoint}:`, payload);
      
      // Fazer a chamada real à API
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      if (responseData && responseData.data) {
        setResultData(responseData.data);
        toast.success("Consulta realizada com sucesso!", { autoClose: 3000 });
        
        // Atualizar o saldo após a consulta
        await fetchUserBalance();
      } else {
        throw new Error("Formato de resposta inválido");
      }
      
      setIsSearching(false);
    } catch (error) {
      console.error('Erro ao enviar dados:', error);
      toast.error("Erro ao processar a solicitação", { autoClose: 3000 });
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Consulta FGTS" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto grid gap-6">
          {/* CARDS DE SALDO */}
          <motion.div
            className="flex gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {[
              {
                icon: <DollarSign size={20} className="text-primary-600" />,
                title: "Total Carregado",
                value: accountLimits?.total_loaded ?? (isLoadingLimits ? "..." : 0),
                subtitle: "Créditos carregados",
              },
              {
                icon: <CreditCard size={20} className="text-primary-600" />,
                title: "Disponível",
                value: accountLimits?.available_limit ?? (isLoadingLimits ? "..." : 0),
                subtitle: "Créditos disponíveis",
              },
              {
                icon: <Activity size={20} className="text-primary-600" />,
                title: "Consultas",
                value: accountLimits?.queries_performed ?? (isLoadingLimits ? "..." : 0),
                subtitle: "Total consultas",
              },
              {
                icon: <UserIcon size={20} className="text-primary-600" />,
                title: "Login",
                value: user?.username || accountLimits?.login || "andrefelipe",
                subtitle: "Usuário logado",
              },
            ].map((c, i) => (
              <div
                key={i}
                className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary-100 rounded-lg">{c.icon}</div>
                  <h3 className="font-semibold">{c.title}</h3>
                </div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-sm text-neutral-500">{c.subtitle}</p>
              </div>
            ))}
          </motion.div>

          {/* Card de Aviso */}
          <div className="bg-blue-100 border border-blue-200 rounded-xl p-6 mb-6">
            <p className="text-blue-800 font-medium">
              O cliente precisa estar na modalidade Saque Aniversário !<br />
              Confirme se os seguintes Bancos estão liberados no aplicativo FGTS:
            </p>
            <ul className="mt-2 text-blue-800 list-disc pl-5">
              <li>Banco Qi Sociedade de Crdedito Direto S.A.</li>
              {/* <li>Banco B</li>
              <li>Banco C</li> */}
            </ul>
            {/* <br />
            <p className="text-blue-800 font-medium">
              Segue o link do video de explicação de como liberar</p> */}
          </div>
          
          {/* Formulário */}
          <motion.div
            className="bg-white border border-neutral-200 rounded-xl shadow p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-semibold text-center mb-8">
              Consulta FGTS
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="nome"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Nome <span className="text-error-500">*</span>
                </label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="europa-input"
                  placeholder="Nome completo"
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-error-500">{errors.nome}</p>
                )}
              </div>
              
              <div>
                <label
                  htmlFor="cpf"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  CPF <span className="text-error-500">*</span>
                </label>
                <InputMask
                  id="cpf"
                  mask="999.999.999-99"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className={`europa-input ${
                    errors.cpf ? "border-error-500" : ""
                  }`}
                  placeholder="000.000.000-00"
                />
                {errors.cpf && (
                  <p className="mt-1 text-sm text-error-500">{errors.cpf}</p>
                )}
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-neutral-700">
                  Consulta Avançada
                </span>
                <button
                  type="button"
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  focus:ring-2 focus:ring-primary-600 ${
                    isEnabled ? "bg-success-500" : "bg-neutral-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${
                      isEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isSearching}
                icon={
                  isSearching ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Search size={18} />
                  )
                }
              >
                {isSearching ? "Pesquisando..." : "Pesquisar"}
              </Button>
            </form>
          </motion.div>

          {/* Resultados da Consulta */}
          {resultData && (
            <motion.div
              className="bg-white border border-neutral-200 rounded-xl shadow p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-semibold text-center mb-8">
                Resultado da Consulta
              </h2>
              
              {/* Informações do Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <UserIcon size={20} className="text-primary-600" />
                    </div>
                    <h3 className="font-semibold">Dados do Cliente</h3>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium">Nome:</span> {resultData.nomeCliente}</p>
                    <p><span className="font-medium">CPF:</span> {resultData.cpfCliente}</p>
                    <p><span className="font-medium">Status:</span> {resultData.statusGeral}</p>
                    <p><span className="font-medium">Data da Proposta:</span> {formatDate(resultData.dataProposta)}</p>
                  </div>
                </div>
                
                <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <DollarSign size={20} className="text-primary-600" />
                    </div>
                    <h3 className="font-semibold">Valores</h3>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium">Valor Total Simulado:</span> {formatCurrency(resultData.valorTotalSimulado)}</p>
                    <p><span className="font-medium">Valor Líquido Disponível:</span> {formatCurrency(resultData.valorLiquidoDisponivel)}</p>
                    <p><span className="font-medium">Custo Total do Contrato:</span> {formatCurrency(resultData.custoTotalContrato)}</p>
                  </div>
                </div>
              </div>
              
              {/* Parcelas */}
              <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Calendar size={20} className="text-primary-600" />
                  </div>
                  <h3 className="font-semibold">Parcelas</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-100">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                          Nº
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                          Data de Vencimento
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {resultData.parcelas.map((parcela) => (
                        <tr key={parcela.numeroParcela}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                            {parcela.numeroParcela}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                            {formatDate(parcela.dataVencimento)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                            {formatCurrency(parcela.valorParcela)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Resumo */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText size={20} className="text-green-600" />
                  </div>
                  <h3 className="font-semibold text-green-800">Resumo da Operação</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-neutral-500">Valor Total</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(resultData.valorTotalSimulado)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-neutral-500">Valor Líquido</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(resultData.valorLiquidoDisponivel)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-neutral-500">Total de Parcelas</p>
                    <p className="text-xl font-bold text-green-700">{resultData.parcelas.length}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsultaFGTS;
