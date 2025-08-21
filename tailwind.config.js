module.exports = {
  theme: {
    extend: {
      boxShadow: {
        'inner-custom': 'inset 0 0 20px rgb(255, 255, 255), inset 0 0 10px rgba(255, 255, 255, 0.42)',
      },
      keyframes: {
        blob1: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '100%': { transform: 'translate(60px, 80px) scale(1.15)' },
        },
        blob2: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '100%': { transform: 'translate(-80px, -60px) scale(1.1)' },
        },
        blob3: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '100%': { transform: 'translate(40px, -40px) scale(1.2)' },
        },
      },
      animation: {
        blob1: 'blob1 18s ease-in-out infinite alternate',
        blob2: 'blob2 22s ease-in-out infinite alternate',
        blob3: 'blob3 26s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ]
}
