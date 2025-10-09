import React, { useState, useCallback } from "react";

const DragAndDropUpload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(event.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`w-full h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition cursor-pointer
            ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"}
          `}
        >
          <p className="text-gray-600 font-medium">
            {isDragging ? "Drop files here..." : "Drag & drop files here"}
          </p>
          <p className="text-sm text-gray-400">or click to browse</p>
          <input
            type="file"
            multiple
            id="fileUpload"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="fileUpload"
            className="mt-3 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
          >
            Choose Files
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-gray-700">Selected Files:</h4>
            <ul className="text-sm text-gray-600 list-disc list-inside">
              {files.map((file, index) => (
                <li key={index}>
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragAndDropUpload;
