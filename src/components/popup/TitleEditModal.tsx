import { useState, useEffect, useRef } from "react";

type TitleEditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => Promise<void> | void;
  title: string;
  placeholder?: string;
  label?: string;
  instruction?: string;
  isLoading?: boolean;
  error?: string | null;
};

export default function TitleEditModal({
  isOpen,
  onClose,
  onSave,
  title,
  placeholder = "e.g., 'Weekly Sales Report Summary - July 2025'",
  label = "Title",
  instruction = "Add a Descriptive Summary Title",
  isLoading = false,
  error = null,
}: TitleEditModalProps) {
  const [editedTitle, setEditedTitle] = useState(title);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update editedTitle when title prop changes
  useEffect(() => {
    if (isOpen) {
      setEditedTitle(title);
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, title]);

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!editedTitle.trim()) {
      return;
    }

    // Don't save if title hasn't changed
    if (editedTitle.trim() === title.trim()) {
      onClose();
      return;
    }

    await onSave(editedTitle.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey && !isLoading) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Edit title dialog"
        className="max-w-[500px] min-w-[400px] bg-white backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 px-6 py-10 flex flex-col items-center text-center"
      >
        <div className="mx-auto space-y-4 w-full">
          {/* Title */}
          <h2 className="text-[28px] font-bold text-center text-[#1F2937]">{label}</h2>

          {/* Instruction */}
          <p className="text-[18px] font-[400] mb-6 text-[#4B5563]">{instruction}</p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}

          {/* Input Field */}
          <div className="mb-6 w-full">
            <textarea
              ref={inputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={placeholder}
              rows={3}
              className="w-full px-4 py-3 min-h-[70px] border-1 border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#DFDFDF] focus:shadow-sm text-[14px] text-[#1F2937] disabled:opacity-50 disabled:cursor-not-allowed bg-white resize-none overflow-y-auto"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex w-full gap-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="py-2.5 w-full rounded-full bg-gray-100 border-[#DFDFDF] border-t border-r border-b-2 border-l text-[#4B5563]  hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-[16px] font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !editedTitle.trim()}
              className="w-full py-2.5 rounded-full text-white bg-[linear-gradient(180deg,#3F7EF8_0%,#5B9AFF_100%)] border-b-[3px] border-b-[rgba(66,129,249,1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-[16px] font-bold justify-center gap-2"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

