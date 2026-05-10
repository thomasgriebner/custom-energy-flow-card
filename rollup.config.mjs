import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import { visualizer } from 'rollup-plugin-visualizer';

const isProd = process.env.NODE_ENV === 'production';
const isAnalyze = process.env.ANALYZE === '1';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/custom-energy-flow-card.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.json' }),
    isProd && terser(),
    isAnalyze && visualizer({ filename: 'dist/bundle-stats.html', open: false }),
  ].filter(Boolean),
};
