type Props = {
    iconSrc: string;
    title: string;
    description: string;
    border?: string;
    onClose?: () => void;
  };
  
  export default function GenratingSumModal({
    iconSrc,
    title,
    description,
    border,
    onClose,
  }: Props) {
    return (
      // Full-screen overlay
      <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 cursor-pointer">
        {/* Modal content */}
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Processing dialog"
          className={`max-w-[800px] bg-white rounded-2xl shadow-xl px-16 flex flex-col items-center text-center ${
            border ? border : ""
          }`}
        >
          <div className="flex items-center justify-center mb-4 mt-12 w-12 h-12">
            <img src={iconSrc} alt="" className="w-full h-full object-contain" />
          </div>
  
          <h2 className="text-[22px] font-bold text-center text-[#1F2937] mb-2">
            {title}
          </h2>
  
          <p className="text-center font-medium text-[#4B5563] text-[18px] mb-8">
            {description}
          </p>
        </div>
      </div>
    );
  }
  