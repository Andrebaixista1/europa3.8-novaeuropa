import React, { useState } from "react";
import DashboardHeader from "../components/DashboardHeader";

interface Proposta {
  produto_nome?: string;
  cliente_nome?: string;
  valor_referencia?: string | number;
  valor_parcela?: string | number;
  status_nome?: string;
  id_proposta_banco?: string | number;
}

type ResultadosPorProduto = { [tipo: string]: Proposta[] };
type IndicesAtuais = { [tipo: string]: number };

const Selene: React.FC = () => {
  const [cpf, setCpf] = useState("");
  const [resultados, setResultados] = useState<ResultadosPorProduto>({});
  const [indices, setIndices] = useState<IndicesAtuais>({});
  const [showCaixa, setShowCaixa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    setShowCaixa(false);
    const cpfLimpo = cpf.replace(/\D/g, "");
    try {
      const res = await fetch(
        "https://n8n.sistemavieira.com.br/webhook/75430a70-94d0-4bc2-99c2-96e8353c6b52",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpf: cpfLimpo }),
        }
      );
      if (!res.ok) throw new Error("Cliente não encontrado.");

      let respostaN8n: any;
      try {
        respostaN8n = await res.json();
      } catch {
        respostaN8n = null;
      }

      let dados: Proposta[] = [];
      if (Array.isArray(respostaN8n)) {
        dados = respostaN8n;
      } else if (respostaN8n && "data" in respostaN8n && Array.isArray(respostaN8n.data)) {
        dados = respostaN8n.data;
      } else if (respostaN8n && "result" in respostaN8n && Array.isArray(respostaN8n.result)) {
        dados = respostaN8n.result;
      } else if (respostaN8n) {
        dados = [respostaN8n];
      }

      if (!dados || !dados.length) throw new Error("Nenhuma proposta encontrada para esse CPF.");

      const agrupados: ResultadosPorProduto = {};
      const novosIndices: IndicesAtuais = {};
      dados.forEach((item) => {
        const tipo = item.produto_nome || "Outro";
        if (!agrupados[tipo]) agrupados[tipo] = [];
        agrupados[tipo].push(item);
      });
      Object.keys(agrupados).forEach((tipo) => {
        novosIndices[tipo] = 0;
      });
      setResultados(agrupados);
      setIndices(novosIndices);
      setShowCaixa(true);
    } catch (err) {
      setResultados({});
      setShowCaixa(false);
      setErro((err as Error)?.message || "Erro ao consultar propostas.");
    } finally {
      setLoading(false);
    }
  };

  const mudarIndice = (tipo: string, direcao: number) => {
    setIndices((prev) => {
      const total = resultados[tipo].length;
      const novo = (prev[tipo] + direcao + total) % total;
      return { ...prev, [tipo]: novo };
    });
  };

  const CardProposta = ({
    tipo,
    proposta,
    total,
    idx,
    onPrev,
    onNext,
  }: {
    tipo: string;
    proposta: Proposta;
    total: number;
    idx: number;
    onPrev: () => void;
    onNext: () => void;
  }) => (
    <div
      className="bg-white border border-[#E5EAF2] rounded-2xl shadow-lg max-w-xs w-full mx-auto flex flex-col items-center px-6 py-7 mb-5 transition-all duration-200"
      tabIndex={0}
      aria-label={`Card de proposta ${tipo}`}
    >
      <span className="block text-xs text-[#00A8FF] uppercase font-bold mb-2 tracking-widest">
        {tipo}
      </span>
      <div className="w-full flex flex-col gap-1 mb-2">
        <div className="flex justify-between">
          <span className="text-neutral-400 text-sm">Nome:</span>
          <span className="text-neutral-700 font-medium">
            {proposta.cliente_nome || "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400 text-sm">Valor:</span>
          <span className="text-[#00A8FF] font-bold">
            {proposta.valor_referencia || "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400 text-sm">Parcela:</span>
          <span className="text-neutral-700">
            {proposta.valor_parcela || "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400 text-sm">Status:</span>
          <span
            className={
              "font-bold " +
              (proposta.status_nome === "Aprovada"
                ? "text-green-500"
                : proposta.status_nome === "Pendente"
                ? "text-yellow-500"
                : "text-red-500")
            }
          >
            {proposta.status_nome || "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400 text-sm">ID Proposta:</span>
          <span className="text-neutral-700">
            {proposta.id_proposta_banco || "-"}
          </span>
        </div>
      </div>
      {total > 1 && (
        <div className="flex gap-2 items-center mt-3">
          <button
            onClick={onPrev}
            className="bg-[#EDF5FC] hover:bg-[#00A8FF] text-[#00A8FF] hover:text-white px-4 py-2 rounded-full font-bold transition"
            aria-label="Anterior"
            type="button"
          >
            ←
          </button>
          <span className="text-xs text-neutral-400">
            {idx + 1} de {total}
          </span>
          <button
            onClick={onNext}
            className="bg-[#EDF5FC] hover:bg-[#00A8FF] text-[#00A8FF] hover:text-white px-4 py-2 rounded-full font-bold transition"
            aria-label="Próximo"
            type="button"
          >
            →
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F5F7FB] flex flex-col">
      <DashboardHeader title="Selene - Consulta de Propostas" />
      <div className="flex-1 flex flex-col justify-center items-center pt-10 pb-8">
        <div className="w-full max-w-xl bg-white border border-[#E5EAF2] rounded-3xl shadow-xl px-8 py-10">
          <form
            className="flex flex-col sm:flex-row gap-4 mb-8"
            onSubmit={handleSubmit}
          >
            <input
              type="text"
              placeholder="Digite o CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="flex-1 px-5 py-3 rounded-xl bg-[#F5F7FB] border border-[#E5EAF2] text-neutral-800 text-lg placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-[#00A8FF] transition"
              required
              maxLength={14}
              inputMode="numeric"
              aria-label="CPF"
            />
            <button
              type="submit"
              className="px-8 py-3 rounded-xl bg-[#00A8FF] hover:bg-[#0894da] text-white text-base font-bold transition"
              disabled={loading}
            >
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </form>
          {erro && (
            <div className="text-red-500 text-center mb-4">{erro}</div>
          )}
          <div
            className={
              showCaixa
                ? "grid grid-cols-1 md:grid-cols-2 gap-8 justify-center"
                : "hidden"
            }
          >
            {Object.entries(resultados).map(([tipo, lista]) => {
              const idx = indices[tipo] || 0;
              const dados = lista[idx];
              return (
                <CardProposta
                  key={tipo}
                  tipo={tipo}
                  proposta={dados}
                  total={lista.length}
                  idx={idx}
                  onPrev={() => mudarIndice(tipo, -1)}
                  onNext={() => mudarIndice(tipo, 1)}
                />
              );
            })}
          </div>
          {!loading && !showCaixa && !erro && (
            <div className="text-neutral-400 text-center mt-8">
              Preencha o CPF e clique em consultar para ver as propostas do cliente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Selene;
