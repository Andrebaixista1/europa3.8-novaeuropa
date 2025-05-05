import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Landing from './pages/Landing';
import BatchQueryDashboard from './pages/BatchQueryDashboard';
import IndividualQueryDashboard from './pages/IndividualQueryDashboard';

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;