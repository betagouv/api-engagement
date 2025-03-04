module.exports = {
  content: ["./pages/**/*.js", "./components/**/*.jsx", "./old/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Marianne"],
      },
      colors: {
        "mention-grey": "#666666",
        "neutral-grey-950": "#eeeeee",
        "grey-400": "#e5e5e5",
        "disabled-grey-700": "#929292",
        "light-grey": "#f5f5f5",
      },

      // Old widget
      boxShadow: {
        custom: "0px 4px 14px rgba(0, 0, 0, 0.05)",
      },
      backgroundColor: {
        "red-custom": "rgb(212, 51, 55)",
        "blue-custom": "rgb(7, 3, 145)",
        "red-light": "rgb(254, 241, 242)",
        "blue-btn": "#021191",
      },
      textColor: {
        "red-custom": "rgb(212, 51, 55)",
      },

      screens: {
        xs: { max: "414px" },
      },
      container: {
        screens: {
          xl: "1250px",
        },
        padding: {
          DEFAULT: "15px",
        },
      },
    },
  },
  plugins: [],
};
