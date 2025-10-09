
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import { formatFileSize } from '../helper/formatSize';
import BackButton from '../components/popup/BackButton';

interface PDFViewPageProps {
  pdfData?: {
    title: string;
    size: string;
    content: string;
    summary: string;
    keyPoints: string[];
    transcription: string;
    createdAt: string;
    tag: string;
  };
}

export default function PDFViewPage({ pdfData: propPdfData }: PDFViewPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Normalize incoming data from props, router state, or raw API response
  const rawState = location.state as any;
  const raw = propPdfData || rawState?.pdfData || rawState?.apiResponse || rawState?.data || rawState?.currentSummary;
  console.log(raw,"09090")



  const pdfData = raw;

  const handleBack = () => {
    navigate(-1);
  };

  const handleDownload = () => {
    if (!pdfData) {
      console.error('No PDF data available for download');
      return;
    }
    
    // Use jsPDF to generate PDF
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(pdfData.title, 20, 20);
    
    // Add summary section
    doc.setFontSize(14);
    doc.text('Summary:', 20, 40);
    doc.setFontSize(12);
    const summaryLines = doc.splitTextToSize(pdfData.summary, 170);
    doc.text(summaryLines, 20, 50);
    
    // Add key points section
    let yPos = 50 + (summaryLines.length * 7) + 10;
    doc.setFontSize(14);
    doc.text('Key Points:', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    pdfData.keyPoints.forEach((point: string, index: number) => {
      const pointText = `${index + 1}. ${point}`;
      const pointLines = doc.splitTextToSize(pointText, 170);
      doc.text(pointLines, 20, yPos);
      yPos += pointLines.length * 7;
      
      // Add new page if content exceeds page height
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });
    
    // Save the PDF
    doc.save(`${pdfData.title}.pdf`);
  };

  const handleShare = async () => {
    if (!pdfData) {
      console.error('No PDF data available for sharing');
      return;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: pdfData.title,
          text: pdfData.summary,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to copying to clipboard
        handleCopyToClipboard();
      }
    } else {
      // Fallback to copying to clipboard
      handleCopyToClipboard();
    }
  };

  const handleCopyToClipboard = async () => {
    if (!pdfData) return;
    
    try {
      await navigator.clipboard.writeText(pdfData.summary);
      console.log("Content copied to clipboard");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  // If no PDF data is available, show error message
  if (!pdfData) {
    return (
      <div className="bg-gray-100  flex flex-col items-center justify-center py-6 px-8">
        <div className="w-full max-w-4xl">
          <button 
            onClick={handleBack} 
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-red-500 text-lg font-semibold mb-4">
            No PDF Data Available
          </div>
          <p className="text-gray-600 mb-6">
            The PDF data could not be loaded. Please try generating the PDF again.
          </p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center py-6 px-8 overflow-auto">
      {/* Header */}
      <div className="w-full max-w-4xl mb-4">
    <BackButton handleBack={handleBack} />
      </div>

      {/* Main Content Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-auto">
        {/* Title */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">View PDF</h1>
        </div>


      

        {/* Main Content Area */}
        <div className="px-6 pb-6 overflow-auto">
          <div className="flex items-start gap-6">
            {/* PDF Icon */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
            </div>

            {/* File Info */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{pdfData.title}</h3>
              <p className="text-gray-600 mb-4">Size: {pdfData?.size}</p>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleDownload}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
                <button className="flex items-center text-gray-600 hover:text-gray-800">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Buy Me A Coffee
                </button>
                <button className="flex items-center text-gray-600 hover:text-gray-800">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Feedback
                </button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
             
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-800 mb-2">File Details:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    
                    <li>File Type: {pdfData?.tag}</li>
                    <li>Size: {pdfData.size}</li>
                    <li>Objective: Blank document needs, Obtaining a new pdf file, File Upload Test for your Website or Project, and general development experiments</li>
                  </ul>
                </div>

          

                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-800 mb-2">Information About PDF Format</h5>
                  <p className="text-sm text-gray-600">
                   {pdfData?.summary}
                  </p>
                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    <p>Mimetype: application/pdf</p>
                    <p>Extension: pdf</p>
                    <p>Developer: Adobe</p>
                    <p>Published: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-semibold text-gray-800 mb-3">Example PDF File Information</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Format:</span>
                    <span className="text-gray-800">PDF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Extension:</span>
                    <span className="text-gray-800">pdf</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MIME Type:</span>
                    <span className="text-gray-800">application/pdf</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="text-gray-800">Document</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="text-gray-800">{pdfData.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Developer:</span>
                    <span className="text-gray-800">Adobe</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Tags: {pdfData?.tag}</p>
                  <p className="text-sm text-gray-600 mb-2">Related: Methods and Tools</p>
                  <p className="text-sm text-gray-600 mb-2">Article: for Editing PDF Files</p>
                </div>

            
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-6 bg-gray-50 ">
          <div className="flex gap-4">
            <button
              onClick={handleDownload}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Download
            </button>
            <button
              onClick={handleShare}
              className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Banner */}
   
    </div>
  );
}
