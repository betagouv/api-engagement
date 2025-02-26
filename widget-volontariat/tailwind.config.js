module.exports = {
  content: ["./pages/**/*.js", "./components/**/*.jsx", "./old/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Marianne"],
      },

      colors: {
        "default-grey": "#3a3a3a",
        "mention-grey": "#666666",
        "neutral-grey-950": "#eeeeee",
        "grey-400": "#e5e5e5",
        "disabled-grey-700": "#929292",
        "light-grey": "#f5f5f5",
      },
    },
  },
  plugins: [],
};
