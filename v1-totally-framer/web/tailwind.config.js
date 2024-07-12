const { tailwindTheme } = require("./theme.js")

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./modules/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: tailwindTheme,
    },
    plugins: [],
    corePlugins: {
        preflight: false,
    },
}
