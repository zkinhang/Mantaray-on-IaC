/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        k3s: {
          dark: '#1b1d21',      // Deep distinct background
          block: '#24282f',     // Component background
          border: '#363c47',    // Borders
          primary: '#FFC61C',   // K3s Yellow (Action)
          secondary: '#005F88', // Secondary Blue
          text: '#ffffff',      // White text
          muted: '#9ca3af',     // Muted text
        }
      }
    }
  },
  plugins: [],
}

