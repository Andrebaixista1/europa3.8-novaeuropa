import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import EuropaLogo from '../components/EuropaLogo';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { login, isAuthenticated, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page they were trying to access before being redirected to login
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    // If user is already authenticated, redirect
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    // Update local error state when auth context error changes
    if (error) {
      setErrorMessage(error);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Username and password are required');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const success = await login(username, password);
      if (success) {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-xl shadow-apple p-8"
      >
        <div className="flex justify-center mb-8">
          <EuropaLogo size="lg" />
        </div>
        
        {/* <h2 className="text-2xl font-semibold text-center mb-6">Logar em Nova Europa</h2> */}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1">
              Login
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="europa-input"
              placeholder="Digite seu usuario"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="europa-input"
              placeholder="Digite sua senha"
              disabled={isSubmitting}
            />
          </div>
          
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-error-500 bg-opacity-10 text-error-500 rounded-lg text-sm"
            >
              {errorMessage}
            </motion.div>
          )}
          
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting}
            icon={isSubmitting ? <LoadingSpinner size="sm" /> : <LogIn size={18} />}
            className="py-3 mt-2"
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-neutral-500">
          <p>Test credentials: username "admin", password "admin123"</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;