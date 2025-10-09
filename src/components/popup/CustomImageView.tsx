import React, { useEffect, useState } from "react";

interface CustomImageViewProps {
  fileUrl: string; // image url
  name?: string;    // file name
}

const CustomImageView: React.FC<CustomImageViewProps> = ({ fileUrl, name }) => {
  const [size, setSize] = useState<string>("");

  // Fetch file size from URL
  useEffect(() => {
    async function fetchSize() {
      try {
        const res = await fetch(fileUrl);
        const blob = await res.blob();
        const fileSizeInMB = (blob.size / (1024 * 1024)).toFixed(1); // in MB
        setSize(`${fileSizeInMB} MB`);
      } catch (err) {
        console.error("Failed to fetch image size:", err);
      }
    }
    fetchSize();
  }, [fileUrl]);

  return (
    <div className="flex items-center gap-4 rounded-xl p-3 w-full ">
      {/* Thumbnail */}
      <img
        src={fileUrl}
        alt={name}
        className="w-[90px] h-[60px] object-cover rounded-[4px]"
      />

      {/* File details */}
      <div className="flex flex-col">
        <p className="text-[#4B5563] text-[16px] font-semibold">{name}</p>
        <span className="text-[16px] text-[#4B5563] font-[400]">{size}</span>
      </div>
    </div>
  );
};

export default CustomImageView;
