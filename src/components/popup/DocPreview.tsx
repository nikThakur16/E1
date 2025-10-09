import React from "react";
import type { UploadData } from "../../context/UploadContext";
import { formatFileSize } from "../../helper/formatSize";

interface DocPreviewProps {
  upload: UploadData;
  name?: string;

  icon?: React.ReactNode;
}

  

export default function DocPreview({ upload, icon }: DocPreviewProps) {
  if (!upload) return null;

  const { name,fileName, size } = upload;

  return (
    <div className="  flex items-center gap-4  w-full">
      <div className="">{icon}</div>
      
      <div className="flex gap-2 flex-col">
        <p className="font-semibold text-[#4B5563] text-[16px]">
          {name || fileName || "Unknown File"}
        </p>
        <p className="text-gray-500 font-[400] text-[16px]">{formatFileSize(size)}</p>
      </div>
    </div>
  );
}
