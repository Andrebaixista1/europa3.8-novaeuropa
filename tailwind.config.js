/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0eefe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#38a5f6',
          500: '#0b88e7',
          600: '#007AFF', // Primary blue
          700: '#0055cc',
          800: '#0047a6',
          900: '#003c88',
        },
        secondary: {
          500: '#00C7FF', // Secondary blue
        },
        success: {
          500: '#34c759',
        },
        warning: {
          500: '#ff9500',
        },
        error: {
          500: '#ff3b30',
        },
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      boxShadow: {
        'apple': '0 0 10px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
        'apple-hover': '0 0 15px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'blue-gradient': 'linear-gradient(135deg, #007AFF 0%, #00C7FF 100%)',
      },
    },
  },
  plugins: [],
};