const config = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // To replace
        primary: {
          dark: "#1D367A",
          main: "#000091",
          light: "#0D7BFF",
        },
        neutral: {
          black: "#17192A",
          "black.75": "#3E3F4C",
          "black.50": "#767A83",
          "black.25": "#C8CCD8",
          "black.05": "#F9F9FA",
        }, // To replace

        beige: "#F9F6F2",

        black: "#161616",

        tab: {
          main: "#C1C1FB",
          hover: "#E3E3FD",
        },

        // DSFR colors
        grey: {
          150: "#2f2f2f",
        },

        gray: {
          border: "#dddddd",
          hover: "#f6f6f6",
          dark: "#666",
          main: "#e5e5e5",
          light: "#eee",
          disabled: "#929292",
        },

        orange: {
          dark: "#716043",
          main: "#FA7A35",
          light: "#FEECC2",
          warning: "#fa7a35",
        },

        blue: {
          bg: "#F5F5FE",
          dark: "#000091",
          main: "#1212FF",
          light: "#f0f7ff",
          info: "#0063CB",
          purple: "#C1C1FB",
        },
        green: {
          dark: "#014d0d",
          main: "#18753C",
          light: "#c7fcd0",
          success: "#27a658",
          check: "#23978D",
        },
        red: {
          dark: "#8f0000",
          main: "#CE0500",
          light: "#FBE4E4",
          notif: "#FF5655",
        },
        pink: {
          dark: "#8f0000",
          main: "#FF4BED",
          light: "#a8009c",
        },

        purple: {
          dark: "6E445A",
          main: "#C1C1FB",
          light: "#FEE7FC",
        },
      },
      container: {
        center: true,
        screens: {},
        padding: {
          DEFAULT: "1.25rem",
        },
      },
      // fontFamily: {
      //   poppins: ["Poppins"],
      // },
      fontSize: {
        xxs: "0.625rem",
        "4xl": "2.5rem", // 40px
      },
      lineHeight: {
        12: "3rem", // 48px
      },
      width: {
        18: "4.5rem",
      },
      height: {
        26: "31.5rem",
        86: "22rem",
        150: "37.5rem",
        "1/10": "10%",
      },
      minHeight: {
        768: "768px",
      },
      maxWidth: {
        64: "16rem",
      },
    },
  },
  plugins: [],
};

export default config;
