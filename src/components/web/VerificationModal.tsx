import Button from "../comman/button";


type Props = {
  iconSrc: string;
  title: string;
  description: string;
  buttonText: string;
  belowText?: string;
  border?: string;
  onButtonClick?: () => void;
  onBelowTextClick?: () => void;
  disabled?: boolean;
};

export default function VerificationModal({
  iconSrc,
  title,
  description,
  buttonText,
  belowText,
  border,
  onButtonClick,
  onBelowTextClick,
  disabled,
}: Props) {

  return (
    <div className=" w-full flex items-center justify-center p-6">
      <div
        role="dialog"
        aria-label="Verification dialog"
          className={`max-w-[600px] bg-white rounded-2xl shadow-xl p-4 md:p-16 flex flex-col items-center text-center ${border ? border : ''}`}
      >
        <div className="w-full h-full flex items-center justify-center mb-4">
          <img src={iconSrc} alt="" className="w-20 h-20 object-contain" />
        </div>

        <h2 className="text-[30px] 2xl:text-[40px] font-bold text-center text-[#1F2937] mb-2">{title}</h2>

        <p className="text-center font-medium text-[#4B5563] text-[18px] 2xl:text-[20px] mb-8">{description}</p>

       
        <Button title={buttonText} onClick={onButtonClick} disabled={disabled}/>

        {belowText ? (
          <div onClick={onBelowTextClick}    className="mt-6 text-lg text-[#4B5563] font-bold cursor-pointer">
            {belowText}
          </div>
        ) : null}
      </div>
    </div>
  );
}
