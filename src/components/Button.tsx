import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  disabled = false,
  icon,
  iconPosition = 'left',
  className = '',
}) => {
  const baseClasses = `europa-button font-medium rounded-lg transition-all duration-200 flex items-center justify-center ${
    fullWidth ? 'w-full' : ''
  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

  const variantClasses = {
    primary: 'bg-blue-gradient text-white shadow-apple hover:shadow-apple-hover',
    secondary: 'bg-white text-primary-600 border border-primary-600 shadow-sm hover:bg-primary-50',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </motion.button>
  );
};

export default Button;