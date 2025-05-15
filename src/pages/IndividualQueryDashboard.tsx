import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  CreditCard,
  DollarSign,
  Activity,
  User as UserIcon,
} from "lucide-react";
import InputMask from "react-input-mask";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { Clipboard } from "lucide-react";
import {
  translatePensao,
  translateTipoBloqueio,
  translateTipoCredito,
  translateSituacaoBeneficio,
} from "../utils/translations";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const API_BASE = 'https://apivieiracred.store'; // em prod ficará vazio → usa path relativo e o vercel.json proxya


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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const base = `${API_BASE}/webhook/api`;
    const url = isEnabled ? `${base}/consulta` : `${base}/consultaoff`;
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
      const json = await res.json();
      setPesquisa(json.pesquisa || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
      // **recarrega** os limites (Disponível e Consultas) após a pesquisa
      await fetchAccountLimits();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Consulta Individual" />
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
                  {new Date(pesquisa[0].data_hora_registro).toLocaleDateString(
                    "pt-BR"
                  )}
                </span>
              </div>

              <div className="grid gap-6">
                {/* Informações Básicas */}
                <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                  <h4 className="font-semibold mb-4">Informações Básicas</h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      ["Benefício", pesquisa[0].numero_beneficio],
                      ["CPF", pesquisa[0].numero_documento],
                      ["Nome", pesquisa[0].nome],
                      ["Estado", pesquisa[0].estado],
                    ].map(([lab, val]) => (
                      <div key={lab}>
                        <dt className="text-sm text-neutral-500">{lab}:</dt>
                        <dd className="flex items-center font-medium">
                          {val || "-"}
                          {(lab === "Benefício" || lab === "CPF") && val && (
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(val)}
                              className="ml-2 p-1 rounded hover:bg-neutral-100"
                            >
                              <Clipboard
                                size={16}
                                className="text-neutral-400 hover:text-neutral-600"
                              />
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

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
    
  );
};

export default IndividualQueryDashboard;
