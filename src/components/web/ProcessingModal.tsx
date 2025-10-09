type Props = {
  iconSrc: string;
  title: string;
  description: string;

  border?: string;
};

export default function ProcessingModal({
  iconSrc,
  title,
  description,

  border,
}: Props) {
  return (
    <div className=" w-full flex items-center justify-center p-6">
      <div
        role="dialog"
        aria-label="Processing dialog"
        className={`max-w-[600px] bg-white rounded-2xl shadow-xl p-4 md:p-16 flex flex-col items-center text-center ${
          border ? border : ""
        }`}
      >
        <div className="  flex items-center justify-center   mb-8">
          <img src={iconSrc} alt="" className="w-full h-full object-contain" />
        </div>

        <h2 className="text-[30px] 2xl:text-[40px] font-bold text-center text-[#1F2937] mb-2">
          {title}
        </h2>

        <p className="text-center font-medium text-[#4B5563] text-[18px] 2xl:text-[20px] mb-8">
          {description}
        </p>
      </div>
    </div>
  );
}
