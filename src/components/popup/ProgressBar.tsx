import React from "react";

interface ProgressBarProps {
  value: number;     // current time
  max: number;       // duration
  onChange: (value: number) => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, onChange }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <input
      type="range"
      min={0}
      max={max}
      step="0.1"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="
        w-[250px] h-1 appearance-none rounded-lg cursor-pointer
        bg-gray-200
        [&::-webkit-slider-thumb]:appearance-none
        [&::-webkit-slider-thumb]:w-4
        [&::-webkit-slider-thumb]:h-4
        [&::-webkit-slider-thumb]:rounded-full
        [&::-webkit-slider-thumb]:bg-white
        [&::-webkit-slider-thumb]:border
        [&::-webkit-slider-thumb]:border-blue-500
        [&::-webkit-slider-thumb]:shadow
        [&::-webkit-slider-thumb]:cursor-pointer
        [&::-moz-range-thumb]:w-4
        [&::-moz-range-thumb]:h-4
        [&::-moz-range-thumb]:rounded-full
        [&::-moz-range-thumb]:bg-white
        [&::-moz-range-thumb]:border
        [&::-moz-range-thumb]:border-blue-500
        [&::-moz-range-thumb]:shadow
        [&::-moz-range-thumb]:cursor-pointer
      "
      style={{
        background: `linear-gradient(to right, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%)`
      }}
    />
  );
};

export default ProgressBar;
