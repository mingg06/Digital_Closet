import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// @imgly/background-removal inlines ndarray, which builds its accessors with
// `new Function`. Our CSP forbids 'unsafe-eval', so swap in an equivalent
// eval-free implementation. The library only uses ndarray(data, shape),
// .data, .shape, .get and .set with the default row-major layout.
const ndarrayShim = `var require_ndarray = __commonJS({
  "csp-safe-ndarray"(exports, module) {
    module.exports = function ndarray(data, shape) {
      shape = shape || [data.length];
      var dims = shape.length, stride = new Array(dims), size = 1;
      for (var i = dims - 1; i >= 0; --i) { stride[i] = size; size *= shape[i]; }
      function index(args, count) {
        var k = 0;
        for (var i = 0; i < count; ++i) k += args[i] * stride[i];
        return k;
      }
      return {
        data: data, shape: shape, stride: stride, offset: 0, size: size, dimension: dims,
        index: function () { return index(arguments, dims); },
        get: function () { return data[index(arguments, dims)]; },
        set: function () { return (data[index(arguments, dims)] = arguments[dims]); },
      };
    };
  }
});
`

function cspSafeNdarray(): Plugin {
  return {
    name: 'csp-safe-ndarray',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').includes('@imgly/background-removal/dist/'))
        return null
      const start = code.indexOf('var require_ndarray = __commonJS({')
      const end = code.indexOf('\n});\n', start)
      if (start < 0 || end < 0)
        throw new Error(
          'csp-safe-ndarray: ndarray block not found; re-check after upgrading @imgly/background-removal',
        )
      return {
        code: code.slice(0, start) + ndarrayShim + code.slice(end + 5),
        map: null,
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: { exclude: ['@imgly/background-removal'] },
  plugins: [
    cspSafeNdarray(),
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      injectRegister: false,
      registerType: 'prompt',
      injectManifest: {
        globPatterns: [
          'assets/*.{js,css}',
          'icons/*.png',
          'favicon.svg',
          'manifest.webmanifest',
          'offline.html',
        ],
        // The ONNX runtime for background removal (~1.5 MB of JS) loads only
        // when a photo is cut out; keep it out of the offline precache.
        globIgnores: ['assets/ort*'],
      },
      manifest: {
        id: '/',
        name: 'Digital Closet',
        short_name: 'Closet',
        description: 'Your wardrobe and outfit combinations, in one place.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        lang: 'en',
        theme_color: '#fafaf9',
        background_color: '#fafaf9',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
})
