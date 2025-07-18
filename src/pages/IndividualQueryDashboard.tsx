import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  CreditCard,
  DollarSign,
  Activity,
  User as UserIcon,
  Clipboard,
  Check,
} from "lucide-react";
import InputMask from "react-input-mask";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import {
  translatePensao,
  translateTipoBloqueio,
  translateTipoCredito,
  translateSituacaoBeneficio,
} from "../utils/translations";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const API_BASE = 'https://n8n.sistemavieira.com.br'; // em prod ficará vazio → usa path relativo e o vercel.json proxya


interface FormErrors {
  cpf?: string;
  nb?: string;
}
interface AccountLimits {
  id: number;
  login: string;
  total_loaded: number;
  available_limit: number;
  queries_performed: number;
}

// formata snake_case -> Título
const humanize = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// datas e valores
const formatValue = (key: string, val: any) => {
  if (val == null || val === "") return "-";
  if (/^data_/.test(key)) {
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
  }
  if (/limite_|saldo_/.test(key)) {
    const n = parseFloat(val);
    return isNaN(n)
      ? "-"
      : new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(n);
  }
  if (key === "numero_portabilidades") {
    return val > 0 ? val : "-";
  }
  return val;
};

const IndividualQueryDashboard: React.FC = () => {
  const { user } = useAuth();
  const [cpf, setCpf] = useState("");
  const [nb, setNb] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSearching, setIsSearching] = useState(false);
  const [pesquisa, setPesquisa] = useState<any[] | null>(null);

  const [accountLimits, setAccountLimits] = useState<AccountLimits | null>(
    null
  );
  const [isLoadingLimits, setIsLoadingLimits] = useState(false);

  const [consultaIniciada, setConsultaIniciada] = useState(false);
  const [aguardandoResposta, setAguardandoResposta] = useState(false);

  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  // no topo do seu componente, antes dos useEffect e handleSubmit:
  const fetchAccountLimits = async () => {
    if (!user) return;

    setIsLoadingLimits(true);
    try {
      const res = await fetch(`${API_BASE}/webhook/api/saldo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const d = await res.json();
      setAccountLimits({
        id: d.id,
        login: d.login,
        total_loaded: d.total_carregado,
        available_limit: d.limite_disponivel,
        queries_performed: d.consultas_realizada,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLimits(false);
    }
  };

  // busca saldo
  useEffect(() => {
    if (!user) return;
    setIsLoadingLimits(true);
    fetch(`${API_BASE}/webhook/api/saldo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    })
      .then((r) => r.json())
      .then((d) =>
        setAccountLimits({
          id: d.id,
          login: d.login,
          total_loaded: d.total_carregado,
          available_limit: d.limite_disponivel,
          queries_performed: d.consultas_realizada,
        })
      )
      .catch(console.error)
      .finally(() => setIsLoadingLimits(false));
    fetchAccountLimits();
  }, [user]);

  const validateCPF = (v: string) => v.replace(/[^\d]/g, "").length === 11;
  const validateNB = (v: string) => v.replace(/[^\d]/g, "").length === 10;

  const startRespostaPolling = async (userId: number, cpf: string, nb: string) => {
    try {
      const resposta = await fetch(`${API_BASE}/webhook/api/resposta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, cpf, nb }),
      });
      const json = await resposta.json();
      const resultado = Array.isArray(json) ? json : (json.pesquisa || []);
      if (resultado.length > 0) {
        const statusApi = resultado[0]?.status_api;
        const statusApiVazio = statusApi === null || statusApi === undefined || statusApi === 'null';
        if (statusApi === 'Sucesso') {
          setPesquisa(resultado);
          setAguardandoResposta(false);
          setConsultaIniciada(false);
          setMensagemErro(null);
          toast.success("Consulta realizada com sucesso!");
          await fetchAccountLimits();
          return;
        }
        if (statusApiVazio) {
          setTimeout(() => {
            startRespostaPolling(userId, cpf, nb);
          }, 3000);
          return;
        }
        // Se chegou aqui, é erro
        setAguardandoResposta(false);
        setConsultaIniciada(false);
        setMensagemErro(statusApi);
        setPesquisa(null);
        toast.error(statusApi);
        await fetchAccountLimits();
        return;
      }
      // Se não veio status_api nem nome, tenta de novo após 3 segundos
      setTimeout(() => {
        startRespostaPolling(userId, cpf, nb);
      }, 3000);
    } catch (err) {
      // Em caso de erro, tenta novamente após 3 segundos
      setTimeout(() => {
        startRespostaPolling(userId, cpf, nb);
      }, 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Usuário não autenticado. Faça login novamente.");
      return;
    }

    if (isEnabled && accountLimits?.available_limit !== undefined && accountLimits.available_limit <= 0) {
      toast.error("Não foi possível realizar a consulta online por falta de saldo disponível. \n\nPor favor, utilize a consulta off-line ou solicite saldo adicional à equipe de Planejamento ou ao seu Gerente Expande.");
      return;
    }

    // validações...
    const newErr: FormErrors = {};
    if (!validateCPF(cpf)) newErr.cpf = "CPF inválido";
    if (!validateNB(nb)) newErr.nb = "Número inválido";
    setErrors(newErr);
    if (Object.keys(newErr).length) return;

    // atualiza limite antes de montar o payload (opcional)
    await fetchAccountLimits();

    setIsSearching(true);
    setPesquisa(null);
    setConsultaIniciada(false);
    setAguardandoResposta(false);

    const base = `${API_BASE}/webhook/api`;
    const url = isEnabled ? `${base}/consulta2` : `${base}/consultaoff`;
    const payload: any = {
      id: user.id,
      cpf: cpf.replace(/[^\d]/g, ""),
      nb: nb.replace(/[^\d]/g, ""),
    };
    if (isEnabled)
      payload.limite_disponivel = (
        accountLimits?.available_limit ?? 0
      ).toString();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });


      
      // Não processa resposta, apenas inicia consulta
      setConsultaIniciada(true);
      setAguardandoResposta(true);
      toast.info("Consulta Iniciada. Aguarde a resposta.");

      startRespostaPolling(user.id, payload.cpf, payload.nb);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao iniciar a consulta. Tente novamente.");
    } finally {
      setIsSearching(false);
      await fetchAccountLimits();
    }
  };

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success("Copiado para área de transferência");
    setTimeout(() => setCopiedField(null), 1500);
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Consulta Individual (IN100)" />
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
                value:
                  accountLimits?.total_loaded ?? (isLoadingLimits ? "..." : 0),
                subtitle: "Créditos carregados",
              },
              {
                icon: <CreditCard size={20} className="text-primary-600" />,
                title: "Disponível",
                value:
                  accountLimits?.available_limit ??
                  (isLoadingLimits ? "..." : 0),
                subtitle: "Créditos disponíveis",
              },
              {
                icon: <Activity size={20} className="text-primary-600" />,
                title: "Consultas",
                value:
                  accountLimits?.queries_performed ??
                  (isLoadingLimits ? "..." : 0),
                subtitle: "Total consultas",
              },
              {
                icon: <UserIcon size={20} className="text-primary-600" />,
                title: "Login",
                value: user.username,
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

          {/* FORMULÁRIO */}
          <motion.div
            className="bg-white border border-neutral-200 rounded-xl shadow p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-semibold text-center mb-8">
              Consulta Individual
            </h2>
            {consultaIniciada && aguardandoResposta ? (
              <div className="flex flex-col items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <span className="mt-4 text-lg text-primary-600 font-semibold">
                  Carregando...
                </span>
              </div>
            ) : (
              <>
                {mensagemErro && (
                  <div className="text-center text-red-600 font-semibold mb-4">
                    {mensagemErro}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6">
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
                  <div>
                    <label
                      htmlFor="nb"
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      Número do Benefício <span className="text-error-500">*</span>
                    </label>
                    <InputMask
                      id="nb"
                      mask="999.999.999-9"
                      value={nb}
                      onChange={(e) => setNb(e.target.value)}
                      className={`europa-input ${
                        errors.nb ? "border-error-500" : ""
                      }`}
                      placeholder="000.000.000-0"
                    />
                    {errors.nb && (
                      <p className="mt-1 text-sm text-error-500">{errors.nb}</p>
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
                    disabled={isSearching || aguardandoResposta}
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
              </>
            )}
          </motion.div>

          {/* RESULTADOS */}
          {pesquisa && pesquisa.length > 0 && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  Resultados da Consulta
                </h3>
                <span className="text-sm text-neutral-500">
                  Última Atualização:{" "}
                  {new Date(pesquisa[0].data_hora_registro).toLocaleDateString("pt-BR")}
                  {" às "}
                  {new Date(pesquisa[0].data_hora_registro).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="grid gap-6">
                {/* Informações Básicas */}
                <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                  <h4 className="font-semibold mb-4">Informações Básicas</h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      ["Benefício", pesquisa[0].numero_beneficio, "beneficio"],
                      ["CPF", pesquisa[0].numero_documento, "cpf"],
                      ["Nome", pesquisa[0].nome],
                      ["Estado", pesquisa[0].estado],
                    ].map(([lab, val, field]) => (
                      <div key={lab}>
                        <dt className="text-sm text-neutral-500">{lab}:</dt>
                        <dd className="flex items-center font-medium">
                          {val || "-"}
                          {(lab === "Benefício" || lab === "CPF") && val && (
                            <button
                              type="button"
                              onClick={() => handleCopy(val as string, field as string)}
                              className="ml-2 p-1 rounded hover:bg-neutral-100"
                            >
                              {copiedField === field ? (
                                <Check size={16} className="text-green-600" />
                              ) : (
                                <Clipboard size={16} className="text-neutral-400 hover:text-neutral-600" />
                              )}
                            </button>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {/* Informações Pessoais */}
                <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                  <h4 className="font-semibold mb-4">Informações Pessoais</h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-sm text-neutral-500">Pensão:</dt>
                      <dd className="font-medium">
                        {translatePensao(pesquisa[0].pensao)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Data de Nascimento:
                      </dt>
                      <dd className="font-medium">
                        {formatValue(
                          "data_nascimento",
                          pesquisa[0].data_nascimento
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">Idade:</dt>
                      <dd className="font-medium">
                        {new Date().getFullYear() -
                          new Date(pesquisa[0].data_nascimento).getFullYear()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Tipo de Bloqueio:
                      </dt>
                      <dd className="font-medium">
                        {translateTipoBloqueio(pesquisa[0].tipo_bloqueio)}
                      </dd>
                    </div>
                  </dl>
                </div>
                {/* Informações do Benefício */}
                <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                  <h4 className="font-semibold mb-4">
                    Informações do Benefício
                  </h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Data de Concessão:
                      </dt>
                      <dd className="font-medium">
                        {formatValue(
                          "data_concessao",
                          pesquisa[0].data_concessao
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Término do Benefício:
                      </dt>
                      <dd className="font-medium">
                        {formatValue(
                          "data_final_beneficio",
                          pesquisa[0].data_final_beneficio
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Tipo de Crédito:
                      </dt>
                      <dd className="font-medium">
                        {translateTipoCredito(pesquisa[0].tipo_credito)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Status do Benefício:
                      </dt>
                      <dd
                        className={`font-medium ${
                          translateSituacaoBeneficio(
                            pesquisa[0].situacao_beneficio
                          ) === "Elegível"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {translateSituacaoBeneficio(
                          pesquisa[0].situacao_beneficio
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
                {/* Informações Financeiras */}
                <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                  <h4 className="font-semibold mb-4">
                    Informações Financeiras
                  </h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Saldo Cartão Benefício:
                      </dt>
                      <dd className="font-medium">
                        {formatValue(
                          "saldo_cartao_beneficio",
                          pesquisa[0].saldo_cartao_beneficio
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Saldo Cartão Consignado:
                      </dt>
                      <dd className="font-medium">
                        {formatValue(
                          "saldo_cartao_consignado",
                          pesquisa[0].saldo_cartao_consignado
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Margem Disponível:
                      </dt>
                      <dd className="font-medium">
                        {formatValue(
                          "saldo_credito_consignado",
                          pesquisa[0].saldo_credito_consignado
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Empréstimos Ativos:
                      </dt>
                      <dd className="font-medium">
                        {formatValue(
                          "numero_portabilidades",
                          pesquisa[0].numero_portabilidades
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
                {/* Informações Bancárias */}
                <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                  <h4 className="font-semibold mb-4">Informações Bancárias</h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-sm text-neutral-500">
                        Banco de Desembolso:
                      </dt>
                      <dd className="font-medium">
                        {pesquisa[0].banco_desembolso || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">Agência:</dt>
                      <dd className="font-medium">
                        {pesquisa[0].agencia_desembolso || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">Conta:</dt>
                      <dd className="font-medium">
                        {" "}
                        {pesquisa[0].conta_desembolso &&
                        pesquisa[0].conta_desembolso !== "null"
                          ? pesquisa[0].conta_desembolso
                          : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500">Dígito:</dt>
                      <dd className="font-medium">
                        {" "}
                        {pesquisa[0].digito_desembolso &&
                        pesquisa[0].digito_desembolso !== "null"
                          ? pesquisa[0].digito_desembolso
                          : "-"}
                      </dd>
                    </div>
                  </dl>
                </div>
                {/* Representante Legal */}
                <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                  <h4 className="font-semibold mb-4">Representante Legal</h4>
                  <dl>
                    <dt className="text-sm text-neutral-500">Nome:</dt>
                    <dd className="font-medium">
                      {pesquisa[0].nome_representante_legal || "-"}
                    </dd>
                  </dl>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <footer className="bg-white py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-neutral-500 text-sm">
          <p>© 2025 Nova Europa. Todos os direitos reservados. Criado e Desenvolvido por André Felipe | Lua  0.1.2025</p>
        </div>
      </footer>
    </div>
    
  );
};

export default IndividualQueryDashboard;
