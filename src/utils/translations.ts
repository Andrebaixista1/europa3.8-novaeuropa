// src/utils/translations.ts

export const pensaoMap: Record<string, string> = {
    not_payer: "Não pensionista",
    payer:      "Pensionista",
    benefit:    "Benefício",
  };
  
  export const tipoBloqueioMap: Record<string, string> = {
    blocked_by_benefitiary:  "Bloqueado pelo beneficiário",
    not_blocked:             "Não bloqueado",
    blocked_in_concession:   "Bloqueado na concessão",
    blocked_by_tbm:          "Bloqueado pela TBM",
  };
  
  export const tipoCreditoMap: Record<string, string> = {
    magnetic_card:    "Cartão magnético",
    checking_account: "Conta corrente",
  };
  
  export const situacaoBeneficioMap: Record<string, string> = {
    blocked:    "Bloqueado",
    elegible:   "Elegível",
    inelegible: "Inelegível",
  };
  
  export function translatePensao(key: string): string {
    return pensaoMap[key] ?? key;
  }
  
  export function translateTipoBloqueio(key: string): string {
    return tipoBloqueioMap[key] ?? key;
  }
  
  export function translateTipoCredito(key: string): string {
    return tipoCreditoMap[key] ?? key;
  }
  
  export function translateSituacaoBeneficio(key: string): string {
    return situacaoBeneficioMap[key] ?? key;
  }
  
  // uso no front, ex:
  // translatePensao(pesquisa[0].pensao)
  // translateTipoBloqueio(pesquisa[0].tipo_bloqueio)
  // translateTipoCredito(pesquisa[0].tipo_credito)
  // translateSituacaoBeneficio(pesquisa[0].situacao_beneficio)
  