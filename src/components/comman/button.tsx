type ButtonProps = {
  title: string;
  onClick?: () => void; // optional function, returns void
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

const Button = ({ title, onClick, type = "button", disabled = false }: ButtonProps) => {
  return (
      <button 
        type={type}
        onClick={onClick} 
        disabled={disabled}
        className={`bg-gradient-to-b from-[#3F7EF8] text-white rounded-full to-[#5B9AFF] w-full md:text-[18px] text-[16px] py-2 font-bold border border-b-2 border-[#4281F9] text-center cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {title}
      </button>
  );
};

export default Button
