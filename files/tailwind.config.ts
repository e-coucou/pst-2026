/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: {
        // Thème prose personnalisé pour correspondre à la charte graphique
        DEFAULT: {
          css: {
            color: '#e5e7eb', // gray-300
            a: {
              color: '#dc2626', // red-600
              textDecoration: 'underline',
              textDecorationColor: 'rgba(220, 38, 38, 0.3)',
              '&:hover': {
                color: '#f87171', // red-400
                textDecorationColor: '#dc2626',
              },
            },
            h1: {
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '3rem',
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
              marginTop: '2rem',
              marginBottom: '2rem',
            },
            h2: {
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '2.25rem',
              fontStyle: 'italic',
              letterSpacing: '-0.01em',
              marginTop: '3rem',
              marginBottom: '1.5rem',
              borderTopWidth: '1px',
              borderTopColor: 'rgba(255, 255, 255, 0.1)',
              paddingTop: '1.5rem',
            },
            h3: {
              color: '#dc2626', // red-600
              fontWeight: '900',
              fontSize: '1.5rem',
              fontStyle: 'italic',
              letterSpacing: '-0.01em',
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            h4: {
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '1.25rem',
              letterSpacing: '0.025em',
              marginTop: '1.5rem',
              marginBottom: '0.75rem',
            },
            p: {
              marginTop: '1rem',
              marginBottom: '1rem',
              lineHeight: '1.75',
            },
            code: {
              backgroundColor: '#18181b', // zinc-900
              color: '#dc2626',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
              paddingTop: '0.125rem',
              paddingBottom: '0.125rem',
              borderRadius: '0.375rem',
              borderWidth: '1px',
              borderColor: 'rgba(220, 38, 38, 0.2)',
              fontSize: '0.875em',
              fontWeight: '500',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: '#18181b', // zinc-900
              borderWidth: '1px',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              overflowX: 'auto',
            },
            'pre code': {
              backgroundColor: 'transparent',
              color: '#dc2626',
              borderWidth: '0',
              padding: '0',
              fontSize: '0.875em',
              fontWeight: '400',
            },
            table: {
              borderCollapse: 'collapse',
              width: '100%',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
            },
            thead: {
              backgroundColor: 'rgba(39, 39, 42, 0.5)', // zinc-800/50
              borderBottomWidth: '1px',
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            },
            'thead th': {
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0.75rem',
              textAlign: 'left',
              borderRightWidth: '1px',
              borderRightColor: 'rgba(255, 255, 255, 0.1)',
            },
            'tbody tr': {
              borderBottomWidth: '1px',
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(39, 39, 42, 0.3)', // zinc-900/30
              },
            },
            'tbody td': {
              padding: '0.75rem',
              borderRightWidth: '1px',
              borderRightColor: 'rgba(255, 255, 255, 0.1)',
              '&:last-child': {
                borderRightWidth: '0',
              },
            },
            blockquote: {
              borderLeftWidth: '4px',
              borderLeftColor: '#dc2626', // red-600
              color: '#9ca3af', // gray-400
              fontStyle: 'italic',
              paddingLeft: '1.5rem',
              paddingTop: '1rem',
              paddingBottom: '1rem',
              backgroundColor: 'rgba(39, 39, 42, 0.2)', // zinc-900/20
            },
            'blockquote p:first-of-type::before': {
              content: '""',
            },
            'blockquote p:last-of-type::after': {
              content: '""',
            },
            hr: {
              borderTopColor: 'rgba(255, 255, 255, 0.1)',
              marginTop: '2rem',
              marginBottom: '2rem',
            },
            ul: {
              listStyleType: 'disc',
              marginLeft: '1.25rem',
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            ol: {
              listStyleType: 'decimal',
              marginLeft: '1.25rem',
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            li: {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
            },
            strong: {
              color: '#ffffff',
              fontWeight: '900',
            },
            em: {
              color: '#dc2626', // red-600
              fontStyle: 'italic',
            },
            img: {
              borderRadius: '0.5rem',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              borderWidth: '1px',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
          },
        },
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
