import React from "react";

const BookLoader: React.FC = () => {
  return (
    <div className="flex space-x-1">
      <div className="w-3 h-8 bg-blue-500 animate-flip"></div>
      <div className="w-3 h-8 bg-blue-400 animate-flip [animation-delay:-0.2s]"></div>
      <div className="w-3 h-8 bg-blue-300 animate-flip [animation-delay:-0.4s]"></div>
    </div>
  );
};

export default BookLoader;
