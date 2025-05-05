import React from 'react';
import { Globe } from 'lucide-react';

interface EuropaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const EuropaLogo: React.FC<EuropaLogoProps> = ({ size = 'md', variant = 'dark' }) => {
  const sizeMap = {
    sm: { icon: 24, text: 'text-xl' },
    md: { icon: 32, text: 'text-2xl' },
    lg: { icon: 48, text: 'text-4xl' },
  };

  const colorClass = variant === 'light' ? 'text-white' : 'text-primary-600';

  return (
    <div className="flex items-center gap-2">
      <div className="europa-gradient rounded-full p-2 flex items-center justify-center shadow-sm">
        <Globe
          size={sizeMap[size].icon}
          className="text-white"
          strokeWidth={1.5}
        />
      </div>
      <h1 className={`font-semibold ${sizeMap[size].text} ${colorClass}`}>Nova Europa</h1>
    </div>
  );
};

export default EuropaLogo;