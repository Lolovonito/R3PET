/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2E7D32', // Green 800
                    light: '#4CAF50', // Green 500
                    dark: '#1B5E20', // Green 900
                },
                secondary: {
                    DEFAULT: '#0288D1', // Light Blue 700
                    light: '#03A9F4', // Light Blue 500
                },
                accent: {
                    DEFAULT: '#F57C00', // Orange 700
                    light: '#FF9800', // Orange 500
                }
            }
        },
    },
    plugins: [],
}
