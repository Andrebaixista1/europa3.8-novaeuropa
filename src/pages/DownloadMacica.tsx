import React, { useState, useEffect } from "react";
import DashboardHeader from "../components/DashboardHeader";
import { useAuth } from "../context/AuthContext";

const DownloadMacica: React.FC = () => {
  const { user } = useAuth();
  // Estados dos filtros
  const [idadeMin, setIdadeMin] = useState(25);
  const [idadeMax, setIdadeMax] = useState(74);
  const [prazoMin, setPrazoMin] = useState(60);
  const [prazoMax, setPrazoMax] = useState(84);
  const [restantesMin, setRestantesMin] = useState(0);
  const [restantesMax, setRestantesMax] = useState(100);
  const [pagasMin, setPagasMin] = useState(0);
  const [pagasMax, setPagasMax] = useState(12);
  const [bancoPagamento, setBancoPagamento] = useState<string[]>([]);
  const [bancoEmprestimo, setBancoEmprestimo] = useState<string[]>([]);
  const [inicioDesconto, setInicioDesconto] = useState("");
  const [fimDesconto, setFimDesconto] = useState("");
  const [valorEmprestimoMin, setValorEmprestimoMin] = useState("");
  const [valorEmprestimoMax, setValorEmprestimoMax] = useState("");
  const [valorParcelaMin, setValorParcelaMin] = useState("");
  const [valorParcelaMax, setValorParcelaMax] = useState("");
  const [nascimentoInicio, setNascimentoInicio] = useState("");
  const [nascimentoFim, setNascimentoFim] = useState("");
  const [atualizacaoInicio, setAtualizacaoInicio] = useState("");
  const [atualizacaoFim, setAtualizacaoFim] = useState("");
  const [especie, setEspecie] = useState("");
  const [dibInicio, setDibInicio] = useState("");
  const [dibFim, setDibFim] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bancos, setBancos] = useState<{ codigo: string; nome: string }[]>([]);
  const [isLoadingBancos, setIsLoadingBancos] = useState(false);

  // Carregar bancos ao abrir a página
  useEffect(() => {
    async function fetchBancos() {
      setIsLoadingBancos(true);
      try {
        const res = await fetch("https://n8n.sistemavieira.com.br/webhook-test/api/bancos");
        const data = await res.json();
        // Esperado: array de objetos { codigo, nome }
        setBancos(Array.isArray(data) ? data : []);
      } catch (err) {
        setBancos([]);
      } finally {
        setIsLoadingBancos(false);
      }
    }
    fetchBancos();
  }, []);

  // Função para formatar moeda
  function formatCurrencyInput(value: string) {
    const n = value.replace(/\D/g, "");
    const num = (parseInt(n, 10) / 100).toFixed(2);
    return isNaN(Number(num)) ? "" : Number(num).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // Função para limpar todos os filtros
  function limparFiltros() {
    setIdadeMin(25);
    setIdadeMax(74);
    setPrazoMin(60);
    setPrazoMax(84);
    setRestantesMin(0);
    setRestantesMax(100);
    setPagasMin(0);
    setPagasMax(12);
    setBancoPagamento([]);
    setBancoEmprestimo([]);
    setInicioDesconto("");
    setFimDesconto("");
    setValorEmprestimoMin("");
    setValorEmprestimoMax("");
    setValorParcelaMin("");
    setValorParcelaMax("");
    setNascimentoInicio("");
    setNascimentoFim("");
    setAtualizacaoInicio("");
    setAtualizacaoFim("");
    setEspecie("");
    setDibInicio("");
    setDibFim("");
  }

  // Função para converter moeda para número
  function parseCurrencyToNumber(str: string) {
    if (!str) return null;
    return Number(str.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  }

  // Função para filtrar
  async function filtrar() {
    if (!user) return;
    setIsLoading(true);
    const payload = {
      id: user.id,
      idadeMin,
      idadeMax,
      prazoMin,
      prazoMax,
      restantesMin,
      restantesMax,
      pagasMin,
      pagasMax,
      bancoPagamento,
      bancoEmprestimo,
      inicioDesconto,
      fimDesconto,
      valorEmprestimoMin: parseCurrencyToNumber(valorEmprestimoMin),
      valorEmprestimoMax: parseCurrencyToNumber(valorEmprestimoMax),
      valorParcelaMin: parseCurrencyToNumber(valorParcelaMin),
      valorParcelaMax: parseCurrencyToNumber(valorParcelaMax),
      nascimentoInicio,
      nascimentoFim,
      atualizacaoInicio,
      atualizacaoFim,
      especie,
      dibInicio,
      dibFim,
    };
    try {
      const res = await fetch("https://n8n.sistemavieira.com.br/webhook-test/api/download-macica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("Resposta da API:", data);
      // Aqui depois você pode setar o resultado para exibir na tabela
    } catch (err) {
      console.error("Erro ao filtrar:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Extração (Maciça)" />
      <div className="flex flex-1 px-8 py-8 gap-6 max-w-[1800px] mx-auto w-full">
        {/* Filtros */}
        <div className="bg-white border border-neutral-200 rounded-xl shadow p-6 w-[420px] min-w-[320px] max-w-[440px] flex flex-col gap-4">
          <h3 className="text-lg font-semibold mb-2">Filtros</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Idade Min</label>
              <input type="number" min={0} max={150} value={idadeMin} onChange={e => setIdadeMin(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Idade Max</label>
              <input type="number" min={0} max={150} value={idadeMax} onChange={e => setIdadeMax(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Prazo Min</label>
              <input type="number" min={0} max={200} value={prazoMin} onChange={e => setPrazoMin(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Prazo Max</label>
              <input type="number" min={0} max={200} value={prazoMax} onChange={e => setPrazoMax(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Restantes Min</label>
              <input type="number" min={0} max={200} value={restantesMin} onChange={e => setRestantesMin(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Restantes Max</label>
              <input type="number" min={0} max={200} value={restantesMax} onChange={e => setRestantesMax(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Pagas Min</label>
              <input type="number" min={0} max={200} value={pagasMin} onChange={e => setPagasMin(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Pagas Max</label>
              <input type="number" min={0} max={200} value={pagasMax} onChange={e => setPagasMax(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium">Banco Pagamento</label>
              <select multiple value={bancoPagamento} onChange={e => {
                const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
                setBancoPagamento(options);
              }} className="europa-input w-full min-h-[90px]" disabled={isLoadingBancos}>
                {bancos.map(b => (
                  <option key={b.codigo} value={b.codigo}>{b.codigo} - {b.nome}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium">Banco Empréstimo</label>
              <select multiple value={bancoEmprestimo} onChange={e => {
                const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
                setBancoEmprestimo(options);
              }} className="europa-input w-full min-h-[90px]" disabled={isLoadingBancos}>
                {bancos.map(b => (
                  <option key={b.codigo} value={b.codigo}>{b.codigo} - {b.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Início Desconto</label>
              <input type="date" value={inicioDesconto} onChange={e => setInicioDesconto(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Fim Desconto</label>
              <input type="date" value={fimDesconto} onChange={e => setFimDesconto(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Valor Empréstimo Min</label>
              <input type="text" inputMode="numeric" value={valorEmprestimoMin} onChange={e => setValorEmprestimoMin(formatCurrencyInput(e.target.value))} className="europa-input w-full" placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="text-xs font-medium">Valor Empréstimo Max</label>
              <input type="text" inputMode="numeric" value={valorEmprestimoMax} onChange={e => setValorEmprestimoMax(formatCurrencyInput(e.target.value))} className="europa-input w-full" placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="text-xs font-medium">Valor Parcela Min</label>
              <input type="text" inputMode="numeric" value={valorParcelaMin} onChange={e => setValorParcelaMin(formatCurrencyInput(e.target.value))} className="europa-input w-full" placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="text-xs font-medium">Valor Parcela Max</label>
              <input type="text" inputMode="numeric" value={valorParcelaMax} onChange={e => setValorParcelaMax(formatCurrencyInput(e.target.value))} className="europa-input w-full" placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="text-xs font-medium">Nascimento Início</label>
              <input type="date" value={nascimentoInicio} onChange={e => setNascimentoInicio(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Nascimento Fim</label>
              <input type="date" value={nascimentoFim} onChange={e => setNascimentoFim(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Atualização Início</label>
              <input type="date" value={atualizacaoInicio} onChange={e => setAtualizacaoInicio(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Atualização Fim</label>
              <input type="date" value={atualizacaoFim} onChange={e => setAtualizacaoFim(e.target.value)} className="europa-input w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium">Espécie (até 2 dígitos)</label>
              <input type="text" maxLength={2} value={especie} onChange={e => setEspecie(e.target.value.replace(/\D/g, '').slice(0,2))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">DIB Início</label>
              <input type="date" value={dibInicio} onChange={e => setDibInicio(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">DIB Fim</label>
              <input type="date" value={dibFim} onChange={e => setDibFim(e.target.value)} className="europa-input w-full" />
            </div>
          </div>
          {/* Botões Limpar e Filtrar */}
          <div className="flex justify-between mt-4 gap-2">
            <button type="button" onClick={limparFiltros} className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-600 font-semibold hover:bg-neutral-100 transition">Limpar</button>
            <button type="button" onClick={filtrar} disabled={isLoading} className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
              {isLoading ? "Filtrando..." : "Filtrar"}
            </button>
          </div>
        </div>
        {/* Espaço para tabela */}
        <div className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6 flex items-center justify-center min-h-[400px]">
          <span className="text-neutral-400 text-lg">TABELA PÓS FILTRO</span>
        </div>
      </div>
    </div>
  );
};

export default DownloadMacica;
