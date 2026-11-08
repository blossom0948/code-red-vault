/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        // 심박수 경보 시 사용할 수 있는 확장 여지
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
      },
      animation: {
        heartbeat: 'heartbeat 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
