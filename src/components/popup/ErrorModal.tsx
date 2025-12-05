type Props = {
  error: string;
  onClose: () => void;
  onRetry?: () => void;
  onHome?: () => void;
};

const ErrorModal = ({ error, onClose, onRetry, onHome }: Props) => {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[9px] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Error dialog"
        className="max-w-[500px] min-w-[400px] bg-white rounded-2xl shadow-xl px-6 py-10 flex flex-col items-center text-center"
      >
        <div className="mx-auto space-y-4 w-[80%]">
          <h2 className="text-[28px] font-bold text-center text-[#1F2937]">
            Oops! Something went wrong
          </h2>

          <p className="text-[18px] font-[400] mb-6 text-[#4B5563]">
            {error || "An error occurred. Please try again."}
          </p>

          <div className="flex w-full gap-4">
            {onHome && (
              <button
                onClick={onHome}
                className="bg-[#F1F1F1] w-full text-[16px] font-bold text-[#4B5563] rounded-full text-center py-2 border border-t border-r border-l border-b-2 border-[#DFDFDF] cursor-pointer"
              >
                Home
              </button>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full text-[16px] font-bold text-white bg-[#3F7EF8] rounded-full text-center py-2 border border-t border-r border-l border-b-2 border-[#2563EB] cursor-pointer hover:bg-[#2563EB] transition-colors"
              >
                Retry
              </button>
            )}
            {!onRetry && !onHome && (
              <button
                onClick={onClose}
                className="w-full text-[16px] font-bold text-white bg-[#3F7EF8] rounded-full text-center py-2 border border-t border-r border-l border-b-2 border-[#2563EB] cursor-pointer hover:bg-[#2563EB] transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
