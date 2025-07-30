import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  User as UserIcon,
  Clipboard,
  Check,
} from "lucide-react";
import InputMask from "react-input-mask";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const API_BASE = 'https://n8n.sistemavieira.com.br';

interface FormErrors {
  cpf?: string;
}



interface CartaoDisponivel {
  matricula: string;
  numeroCartao: string;
  liberado: boolean;
  modalidadeSaque: string;
  numeroAdesao: string;
  numeroContaInterna: number;
}

interface LimiteSaque {
  limiteCartao: number;
  limiteDisponivel: number;
  valorMargem: number;
  valorSaqueMaximo: number;
  valorSaqueMinimo: number;
  taxaJurosAnual: number;
  taxaJurosMensal: number;
  valorCetAnual: number;
  valorCetMensal: number;
  valorIof: number;
  valorIofAdicional: number;
  percentualDeLimiteDoSaque: number;
  diaDeVencimento: number;
}

// formata valores monetários
const formatValue = (val: number | null | undefined) => {
  if (val == null || val === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
};

// formata percentuais
const formatPercent = (val: number | null | undefined) => {
  if (val == null || val === undefined) return "-";
  return `${val.toFixed(2)}%`;
};

const ConsultaBMG: React.FC = () => {
  const { user } = useAuth();
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSearching, setIsSearching] = useState(false);
  const [cartaoDisponivel, setCartaoDisponivel] = useState<CartaoDisponivel | null>(null);
  const [limiteSaque, setLimiteSaque] = useState<LimiteSaque | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Preencher automaticamente CPF vindos da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cpfParam = params.get("cpf");
    if (cpfParam) setCpf(cpfParam);
  }, []);



  const validateCPF = (v: string) => v.replace(/[^\d]/g, "").length === 11;

  // Função para fazer chamada SOAP XML via proxy backend
  // NOTA: Para funcionar, você precisa implementar o endpoint /webhook/api/bmg-proxy no backend
  // que fará a chamada SOAP para o BMG e retornará a resposta XML
  const callSoapAPI = async (soapBody: string, endpoint: string, operation: string): Promise<Document> => {
    try {
      // Tentar primeiro via proxy backend para contornar CORS
      const response = await fetch(`${API_BASE}/webhook/api/bmg-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          operation,
          soapBody,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      console.log('XML Response:', xmlText);
      
      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      // Verificar se há erros no XML
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Erro ao parsear XML: ' + parserError.textContent);
      }
      
      return xmlDoc;
    } catch (error) {
      console.error('SOAP API Error:', error);
      throw error;
    }
  };

  // Extrair dados do XML de cartões disponíveis
  const parseCartoesDisponiveis = (xmlDoc: Document): CartaoDisponivel | null => {
    try {
      console.log('Parsing cartões disponíveis...');
      
      // Buscar dentro do array cartoesRetorno
      const cartaoElement = xmlDoc.querySelector('cartoesRetorno cartoesRetorno');
      if (!cartaoElement) {
        console.log('Elemento cartoesRetorno não encontrado');
        return null;
      }

      const matricula = cartaoElement.querySelector('matricula')?.textContent || '';
      const numeroCartao = cartaoElement.querySelector('numeroCartao')?.textContent || '';
      const liberado = cartaoElement.querySelector('liberado')?.textContent === 'true';
      const modalidadeSaque = cartaoElement.querySelector('modalidadeSaque')?.textContent || '';
      const numeroAdesao = cartaoElement.querySelector('numeroAdesao')?.textContent || '';
      const numeroContaInterna = parseInt(cartaoElement.querySelector('numeroContaInterna')?.textContent || '0');

      console.log('Dados extraídos:', { matricula, numeroCartao, liberado, modalidadeSaque, numeroAdesao, numeroContaInterna });

      return {
        matricula,
        numeroCartao,
        liberado,
        modalidadeSaque,
        numeroAdesao,
        numeroContaInterna,
      };
    } catch (error) {
      console.error('Erro ao parsear cartões disponíveis:', error);
      return null;
    }
  };

  // Extrair dados do XML de limite de saque
  const parseLimiteSaque = (xmlDoc: Document): LimiteSaque | null => {
    try {
      console.log('Parsing limite de saque...');
      
      const returnElement = xmlDoc.querySelector('buscarLimiteSaqueReturn');
      if (!returnElement) {
        console.log('Elemento buscarLimiteSaqueReturn não encontrado');
        return null;
      }

      const cetElement = returnElement.querySelector('cetSaqueComplementar');
      if (!cetElement) {
        console.log('Elemento cetSaqueComplementar não encontrado');
        return null;
      }

      const limiteCartao = parseFloat(returnElement.querySelector('limiteCartao')?.textContent || '0');
      const limiteDisponivel = parseFloat(returnElement.querySelector('limiteDisponivel')?.textContent || '0');
      const valorMargem = parseFloat(returnElement.querySelector('valorMargem')?.textContent || '0');
      const valorSaqueMaximo = parseFloat(returnElement.querySelector('valorSaqueMaximo')?.textContent || '0');
      const valorSaqueMinimo = parseFloat(returnElement.querySelector('valorSaqueMinimo')?.textContent || '0');
      const taxaJurosAnual = parseFloat(cetElement.querySelector('taxaJurosAnual')?.textContent || '0');
      const taxaJurosMensal = parseFloat(cetElement.querySelector('taxaJurosMensal')?.textContent || '0');
      const valorCetAnual = parseFloat(cetElement.querySelector('valorCetAnual')?.textContent || '0');
      const valorCetMensal = parseFloat(cetElement.querySelector('valorCetMensal')?.textContent || '0');
      const valorIof = parseFloat(cetElement.querySelector('valorIof')?.textContent || '0');
      const valorIofAdicional = parseFloat(cetElement.querySelector('valorIofAdicional')?.textContent || '0');
      const percentualDeLimiteDoSaque = parseInt(cetElement.querySelector('percentualDeLimiteDoSaque')?.textContent || '0');
      const diaDeVencimento = parseInt(cetElement.querySelector('diaDeVencimento')?.textContent || '0');

      console.log('Dados extraídos:', {
        limiteCartao, limiteDisponivel, valorMargem, valorSaqueMaximo, valorSaqueMinimo,
        taxaJurosAnual, taxaJurosMensal, valorCetAnual, valorCetMensal,
        valorIof, valorIofAdicional, percentualDeLimiteDoSaque, diaDeVencimento
      });

      return {
        limiteCartao,
        limiteDisponivel,
        valorMargem,
        valorSaqueMaximo,
        valorSaqueMinimo,
        taxaJurosAnual,
        taxaJurosMensal,
        valorCetAnual,
        valorCetMensal,
        valorIof,
        valorIofAdicional,
        percentualDeLimiteDoSaque,
        diaDeVencimento,
      };
    } catch (error) {
      console.error('Erro ao parsear limite de saque:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Usuário não autenticado. Faça login novamente.");
      return;
    }

    // validações
    const newErr: FormErrors = {};
    if (!validateCPF(cpf)) newErr.cpf = "CPF inválido";
    setErrors(newErr);
    if (Object.keys(newErr).length) return;

    setIsSearching(true);
    setCartaoDisponivel(null);
    setLimiteSaque(null);

    const cpfClean = cpf.replace(/[^\d]/g, "");

    try {
      // Primeira API - Buscar Cartões Disponíveis
      const soapBody1 = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:web="http://webservice.econsig.bmg.com">   
  <soapenv:Header/>   
  <soapenv:Body>      
    <web:buscarCartoesDisponiveis soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">         
      <param xsi:type="web:CartaoDisponivelParameter">            
        <login xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">RobO.55324</login>            
        <senha xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">Nova2025senha@</senha>             
        <codigoEntidade xsi:type="xsd:int">1581</codigoEntidade>            
        <cpf xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">${cpfClean}</cpf>                   
      </param>      
    </web:buscarCartoesDisponiveis>   
  </soapenv:Body>
</soapenv:Envelope>`;

      toast.info("Buscando cartões disponíveis...");
      const xmlDoc1 = await callSoapAPI(soapBody1, 'https://ws1.bmgconsig.com.br/webservices/SaqueComplementar', 'buscarCartoesDisponiveis');
      const cartao = parseCartoesDisponiveis(xmlDoc1);

      if (!cartao) {
        toast.error("Nenhum cartão disponível encontrado para este CPF.");
        return;
      }

      setCartaoDisponivel(cartao);
      toast.success("Cartão encontrado! Buscando limites...");

      // Segunda API - Buscar Limite de Saque
      const soapBody2 = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.econsig.bmg.com">
   <soapenv:Header/>
   <soapenv:Body>
      <web:buscarLimiteSaque soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
         <param xsi:type="web:DadosCartaoParameter">
            <login xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">RobO.55324</login>
            <senha xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">Nova2025senha@</senha>
            <codigoEntidade xsi:type="xsd:int">1581</codigoEntidade>
            <cpf xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">${cpfClean}</cpf>
            <matricula xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">${cartao.matricula}</matricula>
            <numeroContaInterna xsi:type="xsd:long">${cartao.numeroContaInterna}</numeroContaInterna>
             <tipoSaque xsi:type="xsd:int">1</tipoSaque>
         </param>
      </web:buscarLimiteSaque>
   </soapenv:Body>
</soapenv:Envelope>`;

      const xmlDoc2 = await callSoapAPI(soapBody2, 'https://ws1.bmgconsig.com.br/webservices/SaqueComplementar', 'buscarLimiteSaque');
      const limite = parseLimiteSaque(xmlDoc2);

      if (!limite) {
        toast.error("Erro ao buscar limites de saque.");
        return;
      }

      setLimiteSaque(limite);
      toast.success("Consulta realizada com sucesso!");

    } catch (err) {
      console.error(err);
      toast.error("Erro ao realizar a consulta. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success("Copiado para área de transferência");
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Consulta BMG" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto grid gap-6">
          {/* CARD DE LOGIN */}
          <motion.div
            className="flex gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <UserIcon size={20} className="text-primary-600" />
                </div>
                <h3 className="font-semibold">Login</h3>
              </div>
              <p className="text-2xl font-bold">{user?.username}</p>
              <p className="text-sm text-neutral-500">Usuário logado</p>
            </div>
          </motion.div>

          {/* FORMULÁRIO */}
          <motion.div
            className="bg-white border border-neutral-200 rounded-xl shadow p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-semibold text-center mb-8">
              Consulta BMG
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
                  className={`europa-input ${errors.cpf ? "border-error-500" : ""}`}
                  placeholder="000.000.000-00"
                />
                {errors.cpf && (
                  <p className="mt-1 text-sm text-error-500">{errors.cpf}</p>
                )}
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
          {(cartaoDisponivel || limiteSaque) && (
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
                  Última Atualização: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="grid gap-6">
                {/* Informações do Cartão */}
                {cartaoDisponivel && (
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <h4 className="font-semibold mb-4">Informações do Cartão</h4>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {[
                        ["Matrícula", cartaoDisponivel.matricula, "matricula"],
                        ["Número do Cartão", cartaoDisponivel.numeroCartao, "cartao"],
                        ["Número de Adesão", cartaoDisponivel.numeroAdesao, "adesao"],
                        ["Modalidade de Saque", cartaoDisponivel.modalidadeSaque],
                        ["Status", cartaoDisponivel.liberado ? "Liberado" : "Bloqueado"],
                        ["Conta Interna", cartaoDisponivel.numeroContaInterna.toString()],
                      ].map(([lab, val, field]) => (
                        <div key={lab}>
                          <dt className="text-sm text-neutral-500">{lab}:</dt>
                          <dd className="flex items-center font-medium">
                            {val || "-"}
                            {field && val && (
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
                )}

                {/* Limites e Valores */}
                {limiteSaque && (
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <h4 className="font-semibold mb-4">Limites e Valores</h4>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {[
                        ["Limite do Cartão", formatValue(limiteSaque.limiteCartao)],
                        ["Limite Disponível", formatValue(limiteSaque.limiteDisponivel)],
                        ["Valor da Margem", formatValue(limiteSaque.valorMargem)],
                        ["Saque Máximo", formatValue(limiteSaque.valorSaqueMaximo)],
                        ["Saque Mínimo", formatValue(limiteSaque.valorSaqueMinimo)],
                        ["Percentual de Limite", formatPercent(limiteSaque.percentualDeLimiteDoSaque)],
                      ].map(([lab, val]) => (
                        <div key={lab}>
                          <dt className="text-sm text-neutral-500">{lab}:</dt>
                          <dd className="font-medium">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Taxas e Custos */}
                {limiteSaque && (
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <h4 className="font-semibold mb-4">Taxas e Custos</h4>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {[
                        ["Taxa de Juros Anual", formatPercent(limiteSaque.taxaJurosAnual)],
                        ["Taxa de Juros Mensal", formatPercent(limiteSaque.taxaJurosMensal)],
                        ["CET Anual", formatPercent(limiteSaque.valorCetAnual)],
                        ["CET Mensal", formatPercent(limiteSaque.valorCetMensal)],
                        ["IOF", formatValue(limiteSaque.valorIof)],
                        ["IOF Adicional", formatValue(limiteSaque.valorIofAdicional)],
                        ["Dia de Vencimento", `${limiteSaque.diaDeVencimento}º dia`],
                      ].map(([lab, val]) => (
                        <div key={lab}>
                          <dt className="text-sm text-neutral-500">{lab}:</dt>
                          <dd className="font-medium">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
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

export default ConsultaBMG;
