import DownloadModal from "../components/web/DownloadModal";
// import ProcessingModal from "../components/web/ProcessingModal";


const WebDownload = () => {
  return (
    <div className='bg-[url("/web/verify-bg.svg")] bg-cover bg-center min-h-screen w-full flex items-center justify-center'>
     <DownloadModal/>
     {/* <ProcessingModal iconSrc="/web/loader.gif" title="Verifying..." description="We are verifying your account. This will only take a few seconds."/> */}

    </div>
  );
};

export default WebDownload;
