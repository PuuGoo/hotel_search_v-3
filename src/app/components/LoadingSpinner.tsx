"use client";

import { ClipLoader } from "react-spinners";

const LoadingSpinner = () => {
  return (
    <div className="flex h-full items-center justify-center">
      <ClipLoader size={40} color="#0284c7" />
    </div>
  );
};

export default LoadingSpinner;
