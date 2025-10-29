import React, { type ReactNode } from "react";
import { useUpload, type UploadData } from "../../context/UploadContext";
import AudioWave from "../../helper/AudioWave";
import CustomVideoPlayer from "../../context/CustomVideoPlayer";
import CustomImageView from "./CustomImageView";
import UrlPreviewCard from "./UrlPreviewCard";
import DocPreview from "./DocPreview";
import { useNavigate } from "react-router";
import ErrorPage from "./ErrorPage";

const DocIcons: Record<string, ReactNode> = {
  pdf: (
    <svg width="51" height="60" viewBox="0 0 51 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50.628 17.5557V56.0959C50.628 58.0302 49.1982 59.5977 47.4352 59.5977H11.9101C10.1464 59.5977 8.71729 58.0296 8.71729 56.0959V47.4459V3.82596C8.71729 1.89233 10.1464 0.324219 11.9101 0.324219H34.9175C39.8829 0.413129 50.628 10.869 50.628 17.5557Z" fill="#E2E2E2"/>
    <path d="M8.76376 14.7204H32.9434C34.8757 14.7204 36.4424 16.4387 36.4424 18.5581V30.6373C36.4424 32.7567 34.8757 34.475 32.9434 34.475H4.22411C2.29176 34.475 0.725098 32.7567 0.725098 30.6373V10.8828" fill="#F15642"/>
    <path d="M0.725098 10.8864C0.725098 13.0058 2.29176 14.7241 4.22411 14.7241H8.76376V7.27734H4.22411C2.29176 7.27734 0.725098 8.99562 0.725098 11.115" fill="#BE4030"/>
    <path d="M34.9185 0.324219H38.9189C40.6158 0.324219 42.2431 1.06382 43.4429 2.37969L48.7554 8.20627C49.9551 9.52214 50.6295 11.3069 50.6295 13.1681V17.5557C50.6295 15.3039 48.9649 13.479 46.9125 13.479H42.1891C40.2267 13.479 38.636 11.7344 38.636 9.58207V4.40157C38.6354 2.14984 36.9715 0.324219 34.9185 0.324219Z" fill="#B7B7B7"/>
    <path d="M11.0872 18.5527H7.7911C7.2933 18.5527 6.89038 18.9947 6.89038 19.5406V25.5338V29.6375C6.89038 30.1835 7.2933 30.6254 7.7911 30.6254C8.2889 30.6254 8.69183 30.1835 8.69183 29.6375V26.5217H11.0872C12.4515 26.5217 13.5623 25.304 13.5623 23.8077V21.2668C13.5617 19.7705 12.4515 18.5527 11.0872 18.5527ZM11.7603 23.8077C11.7603 24.2147 11.4583 24.5459 11.0866 24.5459H8.69123V20.5285H11.0866C11.4583 20.5285 11.7603 20.8598 11.7603 21.2668V23.8077Z" fill="white"/>
    <path d="M19.4017 18.5527H16.2672C15.7694 18.5527 15.3665 18.9947 15.3665 19.5406V29.6382C15.3665 30.1842 15.7694 30.6261 16.2672 30.6261H19.4017C20.8555 30.6261 22.0384 29.3286 22.0384 27.7342V21.4446C22.0384 19.8502 20.8561 18.5527 19.4017 18.5527ZM20.237 27.7342C20.237 28.2393 19.8623 28.6503 19.4017 28.6503H17.1679V20.5285H19.4017C19.8623 20.5285 20.237 20.9395 20.237 21.4446V27.7342Z" fill="white"/>
    <path d="M29.7836 18.5527H24.9137C24.4159 18.5527 24.0129 18.9947 24.0129 19.5406V29.6382C24.0129 30.1842 24.4159 30.6261 24.9137 30.6261C25.4115 30.6261 25.8144 30.1842 25.8144 29.6382V25.5773H28.1034C28.6006 25.5773 29.0041 25.1354 29.0041 24.5894C29.0041 24.0434 28.6006 23.6015 28.1034 23.6015H25.8138V20.5285H29.783C30.2802 20.5285 30.6837 20.0866 30.6837 19.5406C30.6837 18.9947 30.2808 18.5527 29.7836 18.5527Z" fill="white"/>
    <path d="M41.0854 48.4543H17.4552C16.9574 48.4543 16.5544 48.0117 16.5544 47.4664C16.5544 46.9211 16.9574 46.4785 17.4552 46.4785H41.086C41.5832 46.4785 41.9867 46.9211 41.9867 47.4664C41.9867 48.0117 41.5826 48.4543 41.0854 48.4543Z" fill="#B7B7B7"/>
    <path d="M41.0854 42.6613H17.4552C16.9574 42.6613 16.5544 42.2188 16.5544 41.6734C16.5544 41.1281 16.9574 40.6855 17.4552 40.6855H41.086C41.5832 40.6855 41.9867 41.1281 41.9867 41.6734C41.9867 42.2188 41.5826 42.6613 41.0854 42.6613Z" fill="#B7B7B7"/>
    <path d="M41.0856 54.2434H17.4554C16.9576 54.2434 16.5547 53.8008 16.5547 53.2555C16.5547 52.7102 16.9576 52.2676 17.4554 52.2676H41.0862C41.5834 52.2676 41.9869 52.7102 41.9869 53.2555C41.9869 53.8008 41.5828 54.2434 41.0856 54.2434Z" fill="#B7B7B7"/>
    </svg>
    
  ),
  doc: (
    <svg
      className="w-5 h-5 text-blue-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M6 2a1 1 0 00-1 1v14a1 1 0 001 1h8a1 1 0 001-1V6l-5-4H6z" />
    </svg>
  ),
  xls: (
    <svg
      className="w-5 h-5 text-green-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M6 2a1 1 0 00-1 1v14a1 1 0 001 1h8a1 1 0 001-1V6l-5-4H6z" />
    </svg>
  ),
  ppt: (
    <svg
      className="w-5 h-5 text-orange-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M6 2a1 1 0 00-1 1v14a1 1 0 001 1h8a1 1 0 001-1V6l-5-4H6z" />
    </svg>
  ),
  txt: (
    <svg
      className="w-5 h-5 text-gray-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M6 2a1 1 0 00-1 1v14a1 1 0 001 1h8a1 1 0 001-1V6l-5-4H6z" />
    </svg>
  ),
  unknown: (
    <svg
      className="w-5 h-5 text-gray-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M6 2a1 1 0 00-1 1v14a1 1 0 001 1h8a1 1 0 001-1V6l-5-4H6z" />
    </svg>
  ),
  audio: (
    <svg
      width="23"
      height="30"
      viewBox="0 0 23 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.0519 0H2.9576C1.4321 0 0.373047 1.35018 0.373047 3.00039V27.0035C0.373047 28.6537 1.4321 30.0039 2.9576 30.0039H19.599C21.1245 30.0039 22.3726 28.6537 22.3726 27.0035V9.00117L14.0519 0ZM12.6651 16.5021C12.6651 16.5021 12.6651 20.5527 12.6651 20.7027C12.6651 22.0529 11.417 23.5531 9.89152 23.8531C8.36601 24.3032 7.11795 23.403 7.11795 22.0529C7.11795 20.7027 8.36601 19.2025 9.89152 18.9025C10.4462 18.7524 10.8623 18.7524 11.2783 18.9025V13.5018H12.6651C15.5774 13.5018 16.8254 18.0023 16.8254 18.0023C16.8254 18.0023 15.5774 16.5021 12.6651 16.5021ZM12.6651 10.5014V2.25029L20.2924 10.5014H12.6651Z"
        fill="#3F7EF8"
      />
    </svg>
  ),

  video: (
    <svg
      className="w-5 h-5 text-purple-600"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M4 4h12v12H4z" />
    </svg>
  ),
  image: (
    <svg
      className="w-5 h-5 text-indigo-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M4 4h12v12H4z" />
    </svg>
  ),
  url: (
    <svg
      className="w-5 h-5 text-green-600"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M10 2a8 8 0 108 8 8 8 0 00-8-8z" />
    </svg>
  ),
  text: (
    <svg
      className="w-5 h-5 text-gray-700"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M4 4h12v12H4z" />
    </svg>
  ),
};

export default function UploadPreviewCard({ upload }: { upload: UploadData }) {
  const {clearUpload}=useUpload();
  const navigate=useNavigate();

  if (!upload) {
    return (
      <ErrorPage
      heading="Oops! File upload failed"
      descriptions={[
        "We couldn't process your file right now but don't worry, your recording is safe.",
        "You can find it anytime under the Unprocessed tab in mobile apps."
      ]}
      footerDescriptions={[
        "Check your internet connection",
        "Try again in a few moments "
      ]}
      onRetry={() => navigate('/popup/upload')}
      onHome={() => navigate('/popup/home')}
    />
    )
  }


  const { type, name, fileUrl, text, fileName, duration } = upload;
  console.log("upload", upload);
  console.log("upload duration:", duration, "type:", typeof duration);


  const handleDiscard=async ()=>{
    await clearUpload();
    navigate("/popup/upload");
    
  }


  return (
    <div className="bg-white rounded-xl shadow-[0_4px_6px_0_#1C191705] p-4 flex items-center justify-between mb-4 w-full">
      <div className=" w-[100%]">
        {type === "audio" && (
          <div className="flex  items-center gap-2">
            <div>{DocIcons[type] || DocIcons.unknown}</div>
            <p className="font-semibold text-[#4B5563] text-[16px]  ">
              {name || fileName || "Unknown File"}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-full">
            {type === "audio" && fileUrl && (
              <>
                {console.log("Passing to AudioWave - fileUrl:", fileUrl, "duration:", upload?.duration)}
                <AudioWave fileUrl={fileUrl} duration={upload?.duration} />
              </>
            )}

            {type === "video" && fileUrl && (
              <CustomVideoPlayer fileUrl={fileUrl} name={name || fileName} />
            )}
            {type === "image" && fileUrl && (
              <CustomImageView fileUrl={fileUrl} name={name || fileName} />
            )}
            {type === "text" && text && (
              <pre className="mt-1 text-sm text-gray-600 max-h-20 overflow-auto whitespace-pre-wrap">
                {text}
              </pre>
            )}
          {type === "url" && (fileUrl || upload?.url) && <UrlPreviewCard fileUrl={fileUrl || upload?.url || ""} />}


            {["pdf", "document", "xls", "ppt", "txt", "unknown"].includes(type) && (
              <p className="text-gray-500 text-sm mt-1">
                <DocPreview upload={upload} name={name || fileName} icon={DocIcons[type] || DocIcons.unknown} />
              </p>
            )}
          </div>
        </div>
      </div>

      <svg
      onClick={handleDiscard} className="cursor-pointer"
        width="37"
        height="36"
        viewBox="0 0 37 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="18.3574"
          cy="18"
          r="18"
          fill="#FF0101"
          fill-opacity="0.08"
        />
        <path
          d="M12.7734 23.5827C12.9401 23.7494 13.1068 23.8327 13.3568 23.8327C13.6068 23.8327 13.7734 23.7494 13.9401 23.5827L18.3568 19.166L22.7734 23.5827C22.9401 23.7494 23.1901 23.8327 23.3568 23.8327C23.5234 23.8327 23.7734 23.7494 23.9401 23.5827C24.2734 23.2494 24.2734 22.7493 23.9401 22.416L19.5234 17.9993L23.9401 13.5827C24.2734 13.2493 24.2734 12.7493 23.9401 12.416C23.6068 12.0827 23.1068 12.0827 22.7734 12.416L18.3568 16.8327L13.9401 12.416C13.6068 12.0827 13.1068 12.0827 12.7734 12.416C12.4401 12.7493 12.4401 13.2493 12.7734 13.5827L17.1901 17.9993L12.7734 22.416C12.4401 22.7493 12.4401 23.2494 12.7734 23.5827Z"
          fill="#FC2533"
        />
      </svg>
    </div>
  );
}