/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Dunkles Blau-Grau Farbschema (basierend auf dem Screenshot)
                primary: {
                    50: '#f5f7fa',
                    100: '#e4e7eb',
                    200: '#cbd2d9',
                    300: '#9aa5b1',
                    400: '#7b8794',
                    500: '#616e7c',
                    600: '#52606d',
                    700: '#3e4c59',
                    800: '#323f4b',
                    900: '#1f2933',
                    950: '#1a202c',
                },
                secondary: {
                    300: '#8ca0b3',  // Hellblau (für Texte und Überschriften)
                    400: '#6b8096',
                    500: '#4a5568',
                    600: '#2d3748',
                    700: '#252d3d',
                    800: '#1e212d',
                    900: '#171923',
                    950: '#0f111a',
                },
                accent: {
                    blue: '#688db1',    // Helles Blau für Buttons
                    green: '#9cb68f',   // Helles Grün für Buttons
                    red: '#e16162',     // Für rote Elemente
                },
                background: {
                    dark: '#2B2E3B',    // Haupthintergrund
                    darker: '#252830',  // Seitenleiste
                    card: '#343845',    // Kartenelemente
                },
                // Status-Farben
                green: {
                    400: '#74dd80',
                    500: '#22c55e',
                },
                red: {
                    400: '#f87171',
                    500: '#ef4444',
                },
                amber: {
                    500: '#f59e0b',
                },
                orange: {
                    400: '#fb923c',
                },
                gray: {
                    300: '#d1d5db',
                    400: '#9ca3af',
                    700: '#374151',
                },
            }
        },
    },
    plugins: [require("daisyui")],
}