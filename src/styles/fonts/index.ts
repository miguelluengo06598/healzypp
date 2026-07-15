import localFont from "next/font/local";

const integralCF = localFont({
  src: [
    {
      path: "./integralcf-bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  fallback: ["sans-serif"],
  variable: "--font-integralCF",
});

const satoshi = localFont({
  src: [
    {
      path: "./Satoshi-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./Satoshi-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./Satoshi-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  fallback: ["sans-serif"],
  variable: "--font-satoshi",
});

export { integralCF, satoshi };
