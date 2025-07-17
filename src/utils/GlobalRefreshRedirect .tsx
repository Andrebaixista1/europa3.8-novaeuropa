import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // Supondo que você use react-router-dom

// URL de redirecionamento alvo
const REDIRECT_URL = "https://consulta-in100.vercel.app/";

/**
 * Este componente deve ser renderizado no topo da sua árvore de componentes,
 * idealmente dentro do seu Router, ou como um wrapper para todo o seu App.
 * Ele garante que qualquer tentativa de refresh (F5, Ctrl+R, Cmd+R, botão de refresh do navegador)
 * redirecione o usuário para a URL especificada.
 */
const GlobalRefreshRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Verifica F5 (keyCode 116 ou key 'F5')
      // Verifica Ctrl+R ou Cmd+R (event.ctrlKey ou event.metaKey com key 'r')
      if (
        event.key === "F5" ||
        event.keyCode === 116 ||
        ((event.ctrlKey || event.metaKey) && event.key === "r")
      ) {
        event.preventDefault(); // Previne o comportamento padrão de atualização
        window.location.href = REDIRECT_URL; // Redireciona para a URL especificada
      }
    };

    // Adiciona o listener para keydown
    window.addEventListener("keydown", handleKeyDown);

    // Lógica para lidar com o refresh do navegador (clicar no botão de atualizar)
    // Se a página atual não for a URL de destino, e não for a primeira renderização após um redirecionamento,
    // redireciona. Isso é um pouco mais complexo de pegar de forma 100% limpa apenas no cliente
    // sem causar loops de redirecionamento se a REDIRECT_URL for uma rota interna.
    // A abordagem mais simples é que o keydown já cobre muitos casos de "refresh intencional".
    // Para o botão de refresh do navegador, o comportamento padrão é recarregar a URL atual.
    // Se a intenção é SEMPRE ir para REDIRECT_URL no refresh, a lógica do F5 já ajuda,
    // pois ao recarregar, o componente App (ou onde este hook estiver) será remontado.

    // Se a URL atual JÁ É a URL de destino, não fazemos nada para evitar loops.
    if (window.location.href === REDIRECT_URL) {
      // Opcional: limpar algum estado se necessário, mas geralmente não precisa.
    }

    // Cleanup: remover o event listener quando o componente for desmontado
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate, location]); // Adiciona navigate e location como dependências

  // Este componente apenas envolve os filhos, não renderiza UI própria visível.
  return <>{children}</>;
};

export default GlobalRefreshRedirect;