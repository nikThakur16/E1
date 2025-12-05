import { useNavigate } from "react-router-dom";
import { useUpload } from "../context/UploadContext";
import BackButton from "../components/popup/BackButton";
import { useEffect, useState } from "react";
import UrlModal from "../components/popup/UrlModal";

export default function UploadOptionsPage() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const { upload, setUpload } = useUpload();
  

  // If upload exists (from context or storage), redirect to appropriate process page
  // Recordings should go to /record/process, file uploads to /upload/process
  useEffect(() => {
    if (upload) {
      // Check if this is a recording (file name starts with "recording_")
      const isRecording = upload.fileName?.startsWith("recording_") || 
                         upload.name?.startsWith("recording_");
      
      if (isRecording && upload.type === "audio") {
        // Recording uploads should go to record processing page
        navigate("/popup/record/process", { replace: true });
      } else {
        // File uploads go to upload processing page
        navigate("/popup/upload/process", { replace: true });
      }
    }
  }, [upload, navigate]);

  // function openPersistentUploadWindow() {
  //   chrome?.windows?.create({
  //     url: chrome.runtime.getURL("index.html#/upload/process"),
  //     type: "popup",
  //     width: 600, // slightly bigger than content to fit shadows/margins
  //     height: 600, // smaller so content looks good
  //     left: 1000,
  //     top: 100,
  //     focused: true, // Brings it to front
  //   });
  // }

  // Generic upload handler
  async function handleFileUpload(
    file: File,
    type: "audio" | "video" | "image" | "pdf" | "document" | "url"
  ) { 
    if (!file) return;

    // Update context (handles IDB + storage)
    await setUpload({
      type,
      file,
      name: file.name,
      size: file.size,
      mime: file.type,
    });

    // Navigate immediately
      navigate("/popup/upload/process", { replace: true });
  }

  // Specific handlers  
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.files);
  
    const file = e.target.files?.[0];
   
    if (file) handleFileUpload(file, "audio");

  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
   
    if (file) handleFileUpload(file, "video");
   
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log(e.target.files);
  
    const file = e.target.files?.[0];
   
    if (file) handleFileUpload(file, "image");

  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
   
    if (!file) return;
  
    const ext = file.name.split(".").pop()?.toLowerCase();
    const type: "pdf" | "document" = ext === "pdf" ? "pdf" : "document";
  
    handleFileUpload(file, type); // Already handles popup & storage

  };
  

  const handleSubmit = async (url: string) => {
    await setUpload({
      type: "url",
      fileUrl: url,
      name: url,
      size: 0,
      mime: "text/html",
    });
    // Do NOT navigate here; navigation will happen in useEffect
  };
  useEffect(() => {
    if (upload) {
      console.log("Upload ready, navigating now:", upload);
      // Check if this is a recording (file name starts with "recording_")
      const isRecording = upload.fileName?.startsWith("recording_") || 
                         upload.name?.startsWith("recording_");
      
      if (isRecording && upload.type === "audio") {
        // Recording uploads should go to record processing page
        navigate("/popup/record/process", { replace: true });
      } else {
        // File uploads go to upload processing page
        navigate("/popup/upload/process", { replace: true });
      }
    }
  }, [upload, navigate]);
  

  useEffect(() => {
    // No need to manually rehydrate here; UploadContext handles it
  }, []);
  
  const handleBack = () => {
    navigate("/popup/home");
  }
  

  return (
    <div className="bg-[#F4F8FF] p-4 xl:h-full overflow-auto">
      <div className="w-full ">
        <BackButton handleBack={handleBack} />
      </div>
      <div className="w-full text-center ">
        <h2 className="text-[24px] font-semibold tracking-[-1%] text-[#1F2937] mb-2">
          Upload File
        </h2>
      </div>
      <div className="flex flex-col gap-4 py-4 px-4 bg-[#F4F8FF]">
        {/* upload  audio */}
        <label htmlFor="audio-input" className="block cursor-pointer">
          <div className="flex items-center gap-4 p-4  bg-white rounded-xl shadow-[2px_4px_26px_0px_#1C19170D] ">
            <svg
              className="w-6 h-6 "
              width="18"
              height="24"
              viewBox="0 0 27 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.5199 0.519531H3.40818C1.60527 0.519531 0.353638 2.04953 0.353638 3.91953V31.1195C0.353638 32.9895 1.60527 34.5195 3.40818 34.5195H23.0757C24.8786 34.5195 26.3536 32.9895 26.3536 31.1195V10.7195L16.5199 0.519531ZM14.8809 19.2195C14.8809 19.2195 14.8809 23.8095 14.8809 23.9795C14.8809 25.5095 13.4059 27.2095 11.603 27.5495C9.80008 28.0595 8.32507 27.0395 8.32507 25.5095C8.32507 23.9795 9.80008 22.2795 11.603 21.9395C12.2586 21.7695 12.7502 21.7695 13.2419 21.9395V15.8195H14.8809C18.3228 15.8195 19.7978 20.9195 19.7978 20.9195C19.7978 20.9195 18.3228 19.2195 14.8809 19.2195ZM14.8809 12.4195V3.06953L23.8952 12.4195H14.8809Z"
                fill="#3F7EF8"
              />
            </svg>

            <div>
              <h3 className="font-semibold  text-[#1F2937] text-[15px]">
                Upload audio
              </h3>
              <p className="text-[13px] text-[#4B5563] font-[400] ">
                Upload any audio file for summarization
              </p>
            </div>
            <input
              id="audio-input"
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={handleAudioUpload}
            />
          </div>
        </label>

        {/* Upload Video */}
        <label htmlFor="video-input" className="block cursor-pointer">
          <div className="flex items-center gap-4 p-4  bg-white rounded-xl shadow-[2px_4px_26px_0px_#1C19170D] ">
            <svg
              className="w-6 h-6 "
              width="24"
              height="14"
              viewBox="0 0 35 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M25.9933 12.6584V8.35696C25.9933 7.92681 26.1367 7.43149 26.3348 7.22554L31.043 2.3792C32.5837 0.794166 34.3564 0.348374 34.3564 2.04811V18.9699C34.3564 20.667 32.5837 20.2239 31.043 18.6388L26.3348 13.7925C26.1367 13.5891 25.9933 13.0912 25.9933 12.6584ZM23.767 17.4318C23.767 18.1232 23.4923 18.7863 23.0034 19.2752C22.5145 19.7641 21.8514 20.0388 21.16 20.0388H2.96341C2.272 20.0388 1.60891 19.7641 1.12001 19.2752C0.631107 18.7863 0.356445 18.1232 0.356445 17.4318V3.58101C0.356445 2.8896 0.631107 2.22651 1.12001 1.73761C1.60891 1.24871 2.272 0.974046 2.96341 0.974046H21.16C21.8514 0.974046 22.5145 1.24871 23.0034 1.73761C23.4923 2.22651 23.767 2.8896 23.767 3.58101V17.4318Z"
                fill="#A66CFF"
              />
            </svg>

            <div>
              <h3 className="font-semibold  text-[#1F2937] text-[15px]">
                Upload Video
              </h3>
              <p className="text-[13px] text-[#4B5563] font-[400] ">
                Upload any video file for summarization
              </p>
            </div>
            <input
              id="video-input"
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={handleVideoUpload}
            />
          </div>
        </label>

        {/* upload document */}
        <label htmlFor="document-input" className="block cursor-pointer">
          <div className="flex items-center gap-4 p-4  bg-white rounded-xl shadow-[2px_4px_26px_0px_#1C19170D] ">
            <svg
              className="w-6 h-6 "
              width="29"
              height="35"
              viewBox="0 0 29 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M28.084 14.5605H20.4494C18.8099 14.5605 17.2375 13.9092 16.0782 12.7498C14.9189 11.5905 14.2676 10.0182 14.2676 8.37864V0.744094C13.9311 0.682596 13.5897 0.651561 13.2476 0.651367H4.99488C3.76524 0.651367 2.58597 1.13984 1.71648 2.00933C0.846993 2.87881 0.358521 4.05809 0.358521 5.28773V30.015C0.358521 31.2446 0.846993 32.4239 1.71648 33.2934C2.58597 34.1629 3.76524 34.6514 4.99488 34.6514H23.5403C24.77 34.6514 25.9493 34.1629 26.8187 33.2934C27.6882 32.4239 28.1767 31.2446 28.1767 30.015V15.5805C28.1765 15.2384 28.1455 14.897 28.084 14.5605ZM6.54034 20.7423H12.7222C13.132 20.7423 13.5251 20.9051 13.815 21.1949C14.1048 21.4848 14.2676 21.8779 14.2676 22.2877C14.2676 22.6976 14.1048 23.0907 13.815 23.3805C13.5251 23.6704 13.132 23.8332 12.7222 23.8332H6.54034C6.13046 23.8332 5.73737 23.6704 5.44754 23.3805C5.15771 23.0907 4.99488 22.6976 4.99488 22.2877C4.99488 21.8779 5.15771 21.4848 5.44754 21.1949C5.73737 20.9051 6.13046 20.7423 6.54034 20.7423ZM21.9949 30.015H6.54034C6.13046 30.015 5.73737 29.8522 5.44754 29.5624C5.15771 29.2725 4.99488 28.8794 4.99488 28.4695C4.99488 28.0597 5.15771 27.6666 5.44754 27.3767C5.73737 27.0869 6.13046 26.9241 6.54034 26.9241H21.9949C22.4048 26.9241 22.7979 27.0869 23.0877 27.3767C23.3775 27.6666 23.5403 28.0597 23.5403 28.4695C23.5403 28.8794 23.3775 29.2725 23.0877 29.5624C22.7979 29.8522 22.4048 30.015 21.9949 30.015Z"
                fill="#F59E0B"
              />
            </svg>
            <div>
              <h3 className="font-semibold  text-[#1F2937] text-[15px]">
                Upload Document{" "}
              </h3>
              <p className="text-[13px] text-[#4B5563] font-[400] ">
                Upload any document for summarization
              </p>
            </div>
            <input
              id="document-input"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.odt,.rtf,.xls,.xlsx,.ppt,.pptx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain"
              className="sr-only"
              onChange={handleDocumentUpload}
            />{" "}
          </div>
        </label>

        {/* Upload image */}
        <label htmlFor="image-input" className="block cursor-pointer">
          <div className="flex items-center gap-4 p-4  bg-white rounded-xl shadow-[2px_4px_26px_0px_#1C19170D] ">
            <svg
              className="w-6 h-6 "
              width="35"
              height="30"
              viewBox="0 0 35 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M34.3604 6.50651C34.3604 3.38984 31.8104 0.839844 28.6937 0.839844H6.02702C2.91035 0.839844 0.360352 3.38984 0.360352 6.50651V23.5065C0.360352 26.6232 2.91035 29.1732 6.02702 29.1732H28.6937C31.8104 29.1732 34.3604 26.6232 34.3604 23.5065V6.50651ZM8.86035 6.50651C10.4187 6.50651 11.6937 7.78151 11.6937 9.33984C11.6937 10.8982 10.4187 12.1732 8.86035 12.1732C7.30202 12.1732 6.02702 10.8982 6.02702 9.33984C6.02702 7.78151 7.30202 6.50651 8.86035 6.50651ZM31.527 23.5065C31.527 25.0648 30.252 26.3398 28.6937 26.3398H6.59368C5.31869 26.3398 4.75202 24.7815 5.60202 23.9315L10.702 18.8315C11.2687 18.2648 12.1187 18.2648 12.6854 18.8315L13.5354 19.6815C14.102 20.2482 14.952 20.2482 15.5187 19.6815L24.8687 10.3315C25.4354 9.76484 26.2854 9.76484 26.852 10.3315L31.102 14.5815C31.3854 14.8648 31.527 15.1482 31.527 15.5732V23.5065Z"
                fill="#007AFF"
              />
            </svg>

            <div>
              <h3 className="font-semibold  text-[#1F2937] text-[15px]">
                Upload image
              </h3>
              <p className="text-[13px] text-[#4B5563] font-[400] ">
                Upload an image with text for summarization
              </p>
            </div>
            <input
              id="image-input"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageUpload}
            />
          </div>
        </label>
        {/* url */}
        <label>
          <div
            onClick={() => setShowModal(true)}
            className="flex items-center gap-4 p-4  bg-white rounded-xl shadow-[2px_4px_26px_0px_#1C19170D] "
          >
            <svg
              className="w-6 h-6 "
              width="35"
              height="34"
              viewBox="0 0 35 34"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clip-path="url(#clip0_1166_6908)">
                <path
                  d="M12.8052 26.9811L11.0848 28.6896C9.59344 30.1678 7.16797 30.1691 5.67749 28.6896C4.96094 27.9786 4.56739 27.0343 4.56739 26.0304C4.56739 25.0266 4.96137 24.0818 5.67707 23.3708L12.0096 17.088C13.322 15.7866 15.7908 13.8703 17.5902 15.6549C18.416 16.4751 19.7497 16.4696 20.5695 15.6443C21.3897 14.8189 21.3846 13.4848 20.5589 12.6654C17.5001 9.63008 12.9794 10.1911 9.04222 14.0977L2.70929 20.3809C1.18992 21.8892 0.353516 23.8952 0.353516 26.0304C0.353516 28.1656 1.18992 30.1712 2.70972 31.6795C4.27329 33.2308 6.32647 34.006 8.38049 34.006C10.4349 34.006 12.489 33.2308 14.0534 31.6787L15.7751 29.9697C16.6004 29.1503 16.6051 27.8167 15.7848 26.9909C14.9659 26.166 13.6309 26.1613 12.8052 26.9811ZM31.9965 2.57465C28.7112 -0.685096 24.1178 -0.861896 21.0765 2.1556L18.932 4.28443C18.1062 5.10425 18.1011 6.43748 18.9213 7.26325C19.7416 8.08903 21.0752 8.0937 21.901 7.27388L24.0447 5.14633C25.6202 3.5819 27.6831 4.23045 29.0287 5.56538C29.7461 6.2764 30.1401 7.22118 30.1401 8.22503C30.1401 9.2293 29.7457 10.1741 29.0295 10.8851L22.2733 17.5874C19.184 20.6525 17.7347 19.2138 17.1164 18.6001C16.2906 17.7803 14.9574 17.7854 14.1371 18.6108C13.3169 19.4361 13.322 20.7702 14.1477 21.5896C15.566 22.9972 17.1848 23.695 18.8818 23.695C20.9596 23.695 23.1543 22.6487 25.2411 20.5768L31.9973 13.8746C33.5163 12.3662 34.3535 10.3598 34.3535 8.2246C34.3535 6.09025 33.5163 4.08383 31.9965 2.57465Z"
                  fill="#34C759"
                />
              </g>
              <defs>
                <clipPath id="clip0_1166_6908">
                  <rect
                    width="34"
                    height="34"
                    fill="white"
                    transform="translate(0.353516 0.00585938)"
                  />
                </clipPath>
              </defs>
            </svg>

            <div>
              <h3 className="font-semibold  text-[#1F2937] text-[15px] ">
                URL
              </h3>
              <p className="text-[13px] text-[#4B5563] font-[400] ">
                Paste a web link to summarize its content
              </p>
            </div>
          </div>
        </label>

        {/* Image */}
        <label onClick={()=> navigate("/popup/text")}>
          <div className="flex items-center gap-4 p-4 cursor-pointer bg-white rounded-xl shadow-[2px_4px_26px_0px_#1C19170D] ">
            <svg
              className="w-6 h-6 "
              width="33"
              height="35"
              viewBox="0 0 33 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M15.2557 26.4195L25.5573 16.118C27.115 14.56 29.6411 14.56 31.1988 16.118C32.7566 17.6758 32.7566 20.2016 31.1988 21.7596L20.8973 32.0611C20.2966 32.6618 19.5441 33.0878 18.7201 33.2938L15.5249 34.0927C14.1354 34.4399 12.8767 33.1814 13.2242 31.7919L14.0228 28.5968C14.2288 27.7727 14.655 27.0202 15.2557 26.4195ZM6.76645 0.0178537H12.0992H14.2323H19.565H21.6981H22.7646C24.5317 0.0178537 25.9642 1.45037 25.9642 3.21749V13.3105C25.2684 13.6086 24.6168 14.0416 24.0487 14.6096L13.7472 24.9112C12.8731 25.7851 12.2531 26.8803 11.9533 28.0795L11.1546 31.2744C11.0922 31.5238 11.0543 31.7708 11.0387 32.0142H3.56682C1.79971 32.0142 0.367188 30.5816 0.367188 28.8145V3.21749C0.367188 1.45037 1.79971 0.0178537 3.56682 0.0178537H4.63336H6.76645ZM19.565 9.61675C19.565 9.02772 19.0874 8.55021 18.4984 8.55021H7.833C7.24397 8.55021 6.76645 9.02772 6.76645 9.61675C6.76645 10.2058 7.24397 10.6833 7.833 10.6833H18.4984C19.0874 10.6833 19.565 10.2058 19.565 9.61675ZM18.4984 17.0826C19.0874 17.0826 19.565 16.605 19.565 16.016C19.565 15.4271 19.0874 14.9495 18.4984 14.9495H7.833C7.24397 14.9495 6.76645 15.4271 6.76645 16.016C6.76645 16.605 7.24397 17.0826 7.833 17.0826H18.4984ZM12.0992 21.3487H7.833C7.24397 21.3487 6.76645 21.8263 6.76645 22.4153C6.76645 23.0042 7.24397 23.4818 7.833 23.4818H12.0992C12.6882 23.4818 13.1657 23.0042 13.1657 22.4153C13.1657 21.8263 12.6882 21.3487 12.0992 21.3487Z"
                fill="#8F2B9F"
              />
            </svg>

            <div>
              <h3 className="font-semibold  text-[#1F2937] text-[15px]">
                Enter Text
              </h3>
              <p className="text-[13px] text-[#4B5563] font-[400] ">
                Type or paste text for summarization
              </p>
            </div>
          </div>
        </label>

        {/* record audio */}
        <label onClick={()=> navigate("/popup/record")}>
          <div className="flex items-center rounded-xl cursor-pointer bg-white shadow-[2px_4px_26px_0px_#1C19170D]  gap-4 p-4  ">
            <svg
              className="w-6 h-6 "
              width="35"
              height="34"
              viewBox="0 0 35 34"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.3722 23.375C20.8933 23.375 23.7472 20.5211 23.7472 17V6.375C23.7472 2.85388 20.8933 0 17.3722 0C13.8511 0 10.9972 2.85388 10.9972 6.375V17C10.9972 20.5211 13.8511 23.375 17.3722 23.375Z"
                fill="#E11D48"
              />
              <path
                d="M27.9972 17V12.75H25.8722V16.6685C25.8722 20.7485 23.1479 24.5055 19.1487 25.3194C13.6874 26.4307 8.87219 22.2679 8.87219 17V12.75H6.74719V17C6.74719 22.1298 10.4043 26.4223 15.2472 27.4104V31.875H10.9972V34H23.7472V31.875H19.4972V27.4104C24.3401 26.4223 27.9972 22.1298 27.9972 17Z"
                fill="#E11D48"
              />
            </svg>

            <div>
              <h3 className="font-semibold  text-[#1F2937] text-[15px]">
                Record Audio{" "}
              </h3>
              <p className="text-[13px] text-[#4B5563] font-[400] ">
                Record an audio for summarization
              </p>
            </div>
          </div>
        </label>
      </div>
      {showModal && (
        <UrlModal onClose={() => setShowModal(false)} onSubmit={handleSubmit} />
      )}
    </div>
  );
}