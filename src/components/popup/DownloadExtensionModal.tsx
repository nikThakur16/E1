import { useEffect, useRef } from "react";
import Button from "../comman/button";

interface DownloadExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadExtensionModal({ isOpen, onClose }: DownloadExtensionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={modalRef}
        role="dialog"
        aria-label="Download Chrome Extension dialog"
        className="max-w-[500px] w-full bg-white rounded-2xl  shadow-xl px-12 py-10 gap-6 flex flex-col items-center text-center"
      >
    

        <p className="text-center font-[400] text-[#4B5563] text-[18px] ">
        You can view this summary again through the mobile apps. Downlload the apps from here:
        </p>

 

        <div className="flex gap-3 w-full px-10">
          {/* Google Play Button */}
          <div className="flex-1" onClick={()=>window.open("https://play.google.com/store/apps/details?id=com.softradix.summarizex&pli=1", "_blank")}>
            <button className="w-full flex gap-2 bg-black rounded-md py-2  items-center justify-center cursor-pointer">
              <img
                src="/web/googlePlay.svg"
                alt="google play"
                className="w-6 h-6"
              />
              <div className="flex flex-col items-start">
                <p className="text-white text-[12px]">Get it on</p>
                <p className="text-white font-semibold text-[14px]">Google Play</p>
              </div>
            </button>
          </div>

          {/* App Store Button */}
          <div className="flex-1"  onClick={()=>window.open("https://apps.apple.com/us/app/summarizex-ai-note-taker/id6747373968", "_blank")}>
            <button className="w-full flex gap-2 bg-black rounded-md py-2  items-center justify-center cursor-pointer">
              <img
                src="/web/whiteApple.svg"
                alt="app store"
                className="w-6 h-6"
              />
              <div className="flex flex-col items-start">
                <p className="text-white text-[12px]">Download on the</p>
                <p className="text-white font-semibold text-[14px]">App Store</p>
              </div>
            </button>
          </div>
        </div>
       <div className="w-full px-6"> <Button title="Download Extension" /></div>
      </div>
    </div>
  );
} 