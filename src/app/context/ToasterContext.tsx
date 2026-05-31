"use client";

import { Toaster } from "react-hot-toast";

const ToasterContext = () => {
  return (
    <Toaster
      position="top-center"
      gutter={8}
      toastOptions={{
        // Long enough to read, with a high z-index wrapper handled by the lib.
        duration: 4000,
        className: "dark:bg-lightgray dark:text-gray-200",
        style: {
          maxWidth: 420,
        },
        success: {
          duration: 3000,
          iconTheme: { primary: "#16a34a", secondary: "#fff" },
        },
        error: {
          duration: 5000,
          iconTheme: { primary: "#dc2626", secondary: "#fff" },
        },
      }}
    />
  );
};

export default ToasterContext;
