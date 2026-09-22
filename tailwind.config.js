/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		maxWidth: {
  			page: '1100px'
  		},
  		// Escala tipográfica de khdemlidaba. Va en `base` (ver src/index.css:
  		// `h1 { @apply text-h1 }`), así que un `<h1>` sin clase de tamaño ya
  		// sale bien; cualquier `text-*` explícito sigue mandando, porque las
  		// utilidades pintan después de la capa base.
  		fontSize: {
  			h1: ['clamp(2rem, 5.5vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
  			h2: ['clamp(1.5rem, 3.5vw, 2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '700' }],
  			h3: ['clamp(1.25rem, 2.4vw, 1.75rem)', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '700' }]
  		},
  		boxShadow: {
  			card: 'var(--sh-card)'
  		},
  		colors: {
  			// ── Tokens de la refonte (portados de khdemlidaba) ──────────────
  			// Canales RGB por variable CSS (ver :root en src/index.css) para
  			// que `bg-accent/10` compile a `rgb(var(--c-accent) / 0.1)`.
  			// ADITIVOS durante la migración: conviven con la paleta por
  			// defecto y con los tokens hsl de shadcn de abajo. Cuando el
  			// último consumidor de shadcn esté migrado, se resetea `colors`
  			// entera y sólo quedan éstos.
  			canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
  			surface: 'rgb(var(--c-surface) / <alpha-value>)',
  			ink: 'rgb(var(--c-ink) / <alpha-value>)',
  			contrast: 'rgb(var(--c-contrast) / <alpha-value>)',
  			soft: 'rgb(var(--c-soft) / <alpha-value>)',
  			'accent-hover': 'rgb(var(--c-accent-hover) / <alpha-value>)',
  			secondary2: 'rgb(var(--c-secondary) / <alpha-value>)',
  			'secondary2-hover': 'rgb(var(--c-secondary-hover) / <alpha-value>)',
  			success: 'rgb(var(--c-success) / <alpha-value>)',
  			error: 'rgb(var(--c-error) / <alpha-value>)',
  			warning: 'rgb(var(--c-warning) / <alpha-value>)',
  			star: 'rgb(var(--c-star) / <alpha-value>)',
  			whatsapp: 'rgb(var(--c-whatsapp) / <alpha-value>)',
  			'whatsapp-hover': 'rgb(var(--c-whatsapp-hover) / <alpha-value>)',
  			// `accent`, `muted` y `border` ya existen abajo con la forma de
  			// shadcn, y con OTRO significado: `bg-accent` es el gris claro
  			// de hover de los menús, `text-muted` un color de fondo. Pisarlos
  			// ahora cambiaría el aspecto de 138 ficheros sin migrar. Durante
  			// la migración van con prefijo `c-`; en el reset final se hace
  			// `sed 's/c-accent/accent/'` (ídem muted, border) y quedan con
  			// los nombres de khdemlidaba.
  			'c-accent': 'rgb(var(--c-accent) / <alpha-value>)',
  			'c-muted': 'rgb(var(--c-muted) / <alpha-value>)',
  			'c-border': 'rgb(var(--c-border) / <alpha-value>)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			brand: {
  				navy: 'hsl(var(--brand-navy))',
  				'navy-deep': 'hsl(var(--brand-navy-deep))',
  				gold: 'hsl(var(--brand-gold))',
  				'gold-deep': 'hsl(var(--brand-gold-deep))',
  				cream: 'hsl(var(--brand-cream))',
  				ink: 'hsl(var(--brand-ink))',
  				surface: 'hsl(var(--brand-surface))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
}