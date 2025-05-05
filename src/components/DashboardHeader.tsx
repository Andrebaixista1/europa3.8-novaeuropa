import React from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EuropaLogo from './EuropaLogo';
import { useAuth } from '../context/AuthContext';

interface DashboardHeaderProps {
  title: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleBackClick = () => {
    navigate('/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="dashboard-header sticky top-0 z-10">
      <div className="flex items-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBackClick}
          className="mr-4 text-neutral-600 hover:text-primary-600 transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft size={20} />
        </motion.button>
        <EuropaLogo size="sm" />
        <span className="ml-6 text-lg font-medium">{title}</span>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLogout}
        className="flex items-center text-neutral-600 hover:text-primary-600 transition-colors"
      >
        <LogOut size={18} className="mr-1" />
        <span>Logout</span>
      </motion.button>
    </header>
  );
};

export default DashboardHeader;