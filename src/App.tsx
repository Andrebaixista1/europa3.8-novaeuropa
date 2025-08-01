// src/App.tsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import BatchQueryDashboard from "./pages/BatchQueryDashboard";
import IndividualQueryDashboard from "./pages/IndividualQueryDashboard";
import CreateLogins from "./pages/CreateLogins";
import UserRecharge from "./pages/UserRecharge"; 
import LuaAIChatPage from "./pages/LuaAIChatPage"
import ConsultaFGTS from "./pages/ConsultaFGTS";
import ConsultaIndividualMacica from "./pages/ConsultaIndividualMacica";
import DownloadMacica from "./pages/DownloadMacica"
import ConexaoWhats from "./pages/ConexaoWhats";
import ConsultaBMG from "./pages/ConsultaBMG";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// ----
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Landing />} />
          <Route
            path="/dashboard/batch"
            element={
              <ProtectedRoute>
                <BatchQueryDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/individual"
            element={
              <ProtectedRoute>
                <IndividualQueryDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/vieirachat"
            element={
              <ProtectedRoute>
                <ConexaoWhats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/create-logins"
            element={
              <ProtectedRoute>
                <CreateLogins />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/recharge-user" // Rota existente que será usada para UserRecharge
            element={
              <ProtectedRoute>
                <UserRecharge /> {/* <<< ALTERADO PARA RENDERIZAR UserRecharge */}
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/lua-ai" // Rota existente que será usada para UserRecharge
            element={
              <ProtectedRoute>
                <LuaAIChatPage /> {/* <<< ALTERADO PARA RENDERIZAR UserRecharge */}
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/consulta-fgts" // Rota existente que será usada para UserRecharge
            element={
              <ProtectedRoute>
                <ConsultaFGTS /> {/* <<< ALTERADO PARA RENDERIZAR UserRecharge */}
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/macica-atualizada" // Rota existente que será usada para UserRecharge
            element={
              <ProtectedRoute>
                <ConsultaIndividualMacica /> {/* <<< ALTERADO PARA RENDERIZAR UserRecharge */}
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/download-macica" // Rota existente que será usada para UserRecharge
            element={
              <ProtectedRoute>
                <DownloadMacica /> {/* <<< ALTERADO PARA RENDERIZAR UserRecharge */}
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/consulta-bmg" // Rota existente que será usada para UserRecharge
            element={
              <ProtectedRoute>
                <ConsultaBMG /> {/* <<< ALTERADO PARA RENDERIZAR UserRecharge */}
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer position="bottom-right" autoClose={3000} />
      </Router>
    </AuthProvider>
  );
}

export default App;

