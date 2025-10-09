import Button from "../comman/button";




export default function DownloadModal (){
  return (
    <div className=" w-full flex items-center justify-center p-6">
      <div
        role="dialog"
        aria-label="Verification dialog"
        className="max-w-[600px] bg-white rounded-2xl shadow-xl p-4 md:px-12 md:py-10 flex flex-col items-center text-center"
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-b from-white to-slate-50 shadow-md mb-4">
          <img src="/web/chrome.svg" alt="" className="w-11 h-11 object-contain" />
        </div>

        <h2 className="text-[22px] md:text-[28px] 2xl:text-[36px] font-bold text-center text-[#1F2937] mb-2">Download Chrome Extension</h2>

        <p className="text-center font-[400] text-[#4B5563] text-[14px] md:text-[18px] 2xl:text-[20px] mb-8">Install our Chrome Extension to easily add powerful features and smart functionality to your browser.</p>

       
        <Button title="Download Extension"/>

          <p className="mt-6 text-[14px] md:text-[16px] text-[#4B5563] font-[400] w-full md:w-[80%]" >
          You can check our application on Google Play and the App Store.

        
          </p>
          <div className="flex gap-4 mt-6 justify-center flex-wrap">
          {/* Google Play Button */}
          <a href="https://play.google.com/store/apps/details?id=com.softradix.summarizex&pli=1">
          <button className="flex gap-2 bg-black rounded-md h-[54px] w-[162px] items-center justify-center cursor-pointer">
            <img
              src="/web/googlePlay.svg"
              alt="google play"
    
            />
            <div className="flex flex-col items-start">
              <p className="text-white text-xs">Get it on</p>
              <p className="text-white font-semibold text-[16px]">Google Play</p>
            </div>
          </button>
          </a>

          {/* App Store Button */}
         <a href="https://apps.apple.com/us/app/summarizex-ai-note-taker/id6747373968">
         <button className="flex gap-2 bg-black rounded-md h-[54px] w-[162px] items-center justify-center  cursor-pointer">
            <img
              src="/web/whiteApple.svg" 
              alt="app store"
            
            />
            <div className="flex flex-col items-start">
              <p className="text-white text-xs">Download on the</p>
              <p className="text-white font-semibold text-[16px]">App Store</p>
            </div>
          </button></a>
        </div>
        
      </div>
    </div>
  );
}
