import { useState } from "react";
import Button from "../comman/button";

type Props = {
  onClose: () => void;
  onSubmit: (url: string) => void; // pass URL back to parent
};

export default function UrlModal({ onClose, onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const isValidHttpUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!url) {
      setError("Enter a valid URL");
      return;
    }
    if (!isValidHttpUrl(url)) {
      setError("Enter a valid URL");
      return;
    }
    setError("");
    setLoading(true);

    try {
      onSubmit(url);

      onClose(); // close modal
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[9px] p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Processing dialog"
        className={`max-w-[800px]  min-w-[400px]  bg-white rounded-2xl shadow-xl px-6  py-8 flex flex-col items-center text-center`}
      >
        <h2 className="text-[22px] font-bold text-center text-[#1F2937] mb-6">
          Enter the URL below
        </h2>
        {error && (
          <div className="text-left text-[12px] text-red-600 mb-2">{error}</div>
        )}

        <div className="w-full relative mb-6">
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#4B556399]"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.3245 15.859L6.3125 16.864C5.43525 17.7335 4.0085 17.7343 3.13175 16.864C2.71025 16.4458 2.47875 15.8903 2.47875 15.2998C2.47875 14.7093 2.7105 14.1535 3.1315 13.7353L6.8565 10.0395C7.6285 9.27402 9.08075 8.14676 10.1392 9.19652C10.625 9.67902 11.4095 9.67577 11.8918 9.19027C12.3743 8.70477 12.3713 7.92002 11.8855 7.43802C10.0863 5.65252 7.427 5.98252 5.111 8.28052L1.38575 11.9765C0.492 12.8638 0 14.0438 0 15.2998C0 16.5558 0.492 17.7355 1.386 18.6228C2.30575 19.5353 3.5135 19.9913 4.72175 19.9913C5.93025 19.9913 7.1385 19.5353 8.05875 18.6223L9.0715 17.617C9.557 17.135 9.55975 16.3505 9.07725 15.8648C8.5955 15.3795 7.81025 15.3768 7.3245 15.859ZM18.6135 1.50227C16.681 -0.415233 13.979 -0.519233 12.19 1.25577L10.9285 2.50802C10.4427 2.99027 10.4397 3.77452 10.9222 4.26027C11.4047 4.74602 12.1892 4.74877 12.675 4.26652L13.936 3.01502C14.8628 2.09477 16.0763 2.47627 16.8678 3.26152C17.2898 3.67977 17.5215 4.23552 17.5215 4.82602C17.5215 5.41677 17.2895 5.97252 16.8682 6.39077L12.894 10.3333C11.0767 12.1363 10.2243 11.29 9.8605 10.929C9.37475 10.4468 8.5905 10.4498 8.108 10.9353C7.6255 11.4208 7.6285 12.2055 8.11425 12.6875C8.9485 13.5155 9.90075 13.926 10.899 13.926C12.1213 13.926 13.4122 13.3105 14.6397 12.0918L18.614 8.14927C19.5075 7.26202 20 6.08177 20 4.82577C20 3.57027 19.5075 2.39002 18.6135 1.50227Z"
              fill="#4B5563"
            />
          </svg>

          <input
            type="text"
            placeholder="URL"
            value={url} // Step 2: bind value
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            className="w-full pl-12 pr-4 py-3  border-[1px] border-[rgba(226,232,240,1)] font-[400] text-[14px] text-[#1F2937] rounded-full focus:outline-none"
          />
        </div>

        <Button
          title={loading ? "Submitting..." : "Submit"}
          onClick={handleSubmit}
        />
      </div>
    </div>
  );
}
