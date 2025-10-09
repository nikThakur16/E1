


type Props = {
  onClose: () => void; // callback to close the modal
  onCancel: () => void;
  title: string;
  description: string;
  btnText: string;
};

export default function CancelModal({ onClose,title,description,onCancel,btnText }: Props) {




  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[9px] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="cancel dialog"
        className={`max-w-[500px]  min-w-[400px]  bg-white rounded-2xl shadow-xl px-6  py-10 flex flex-col items-center text-center`}
      >
       <div className="mx-auto space-y-4 w-[80%]">
       <h2 className="text-[28px] font-bold text-center text-[#1F2937] ">
          {title}
        </h2>

        <p className="text-[18px]  font-[400] mb-6 text-[#4B5563] ">{description}</p>

        <div className="flex w-full gap-4">
            <button onClick={onClose} className="bg-[#F1F1F1] w-full text-[16px] font-bold text-[#4B5563]  rounded-full text-center py-2 border border-t border-r border-l border-b-2 border-[#DFDFDF] cursor-pointer">
                cancel
            </button>
            <button onClick={onCancel}  className="w-full text-[16px] font-bold text-white bg-[#E12E3A]   rounded-full text-center py-2 border border-t border-r border-l border-b-2 border-[#C9000D] cursor-pointer">
                {btnText}
            </button>
           
        </div>
       </div>
      </div>
    </div>
  );
}
