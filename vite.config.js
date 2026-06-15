import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT' || warning.code === 'MISSING_EXPORT') {
          throw new Error(`Build failed: ${warning.message}`);
        }
        warn(warning);
      },
      output: {
        // Code-splitting CONSERVADOR. Vite ya genera chunks por entry/lazy
        // route por defecto y respeta los enlaces import. Cuando se separan
        // vendors a mano (React + radix + i18n…), entran en juego problemas
        // de orden de evaluación: si el browser ejecuta `vendor-maps` antes
        // de que `vendor-react` haya inicializado, `react-leaflet` revienta
        // con `Cannot read properties of undefined (reading 'forwardRef')`.
        //
        // Solo separamos librerías pesadas que SIEMPRE son lazy (su único
        // consumidor está dentro de un componente `lazy()`):
        //   - jspdf / html2canvas: solo se usan en Facturas / PDF.
        //   - quill / react-quill: solo BlogPostEditor (admin).
        //   - three: solo casos de animación opcional.
        //   - fontsource: assets de fuente, no JS de runtime crítico.
        //
        // recharts, leaflet, react-leaflet NO se separan: aunque son pesadas,
        // hacerlo activa el bug de orden de evaluación con React.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Three (animación opcional) y fontsource: chunks aislados.
          if (id.includes('/three/')) return 'vendor-three';
          if (id.includes('/@fontsource/')) return 'vendor-fonts';

          // Utilidades puras (no usan React). Sacarlas a un chunk propio libera
          // peso del catch-all sin riesgo de orden de evaluación con React.
          if (
            id.includes('/lodash/') ||
            id.includes('/lodash-es/') ||
            id.includes('/moment/') ||
            id.includes('/date-fns/')
          ) {
            return 'vendor-utils';
          }

          // jspdf, html2canvas, react-quill: NO se chunkean a mano. Que Vite
          // las meta en el lazy chunk de su consumidor (Presupuestos / Admin),
          // o en un shared chunk que SOLO se cargue al navegar a esas rutas.
          // Si se crea un chunk vendor-pdf compartido, no debería entrar en el
          // modulepreload del entry.

          return undefined; // que Vite/Rollup decidan
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: { loader: { '.js': 'jsx' } },
  },
})
