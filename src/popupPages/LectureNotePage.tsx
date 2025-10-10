import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { type RootState } from "../store";
import { clearLectureNotesData, setPdfViewData } from "../store/slices/navigationSlice";
import Heading from "../components/popup/Heading";
import DropdownMenu from "../components/popup/DropdownMenu";
import BackButton from "../components/popup/BackButton";
import Button from "../components/comman/button";
import Loader from "../components/popup/Loader";
import { formatFileSize } from "../helper/formatSize";

interface BulletPoint {
  text: string;
  isNested: boolean;
}

interface ParsedContent {
  heading: string;
  description: string;
  bulletPoints: BulletPoint[];
}

export default function LectureNotePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { lectureNotesData } = useSelector((state: RootState) => state.navigation);
  
  const [data, setData] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [content, setContent] = useState<ParsedContent[]>([]);
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [apiTitle, setApiTitle] = useState<string>("Lecture Notes");
  
  // Normalize headings by removing leading Roman numerals or numeric prefixes
  const sanitizeHeading = (raw: string): string => {
    try {
      let text = raw.trim();
      // Remove markdown bold markers and trailing colon
      text = text.replace(/\*\*/g, "").replace(/:$/, "");
      // Strip common ordered-prefix patterns once (I., II), (III), 1., 2), (3), A., B)
      text = text.replace(/^\s*\(?([ivxlcdm]+|\d+|[a-zA-Z])\)?[\.|\)]?\s+-?\s*/i, "");
      // Also handle forms like "01 - ", "1 - ", "IV - "
      text = text.replace(/^\s*\(?([ivxlcdm]+|\d+)\)?\s*[-–—]\s*/i, "");
      return text.trim();
    } catch {
      return raw;
    }
  };

  // Enhanced parsing function to handle markdown formatting from API response
  const parseContentFromResponse = (responseText: string): ParsedContent[] => {
    const lines = responseText.split("\n");
    const parsedContent: ParsedContent[] = [];
    let currentSection: ParsedContent | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;

      // Check if it's a heading (## or **text**)
      if (trimmedLine.match(/^#+\s/) || trimmedLine.match(/^\*\*.*\*\*:?\*?\*?$/)) {
        // Save previous section only if it has content
        if (currentSection) {
          const hasDescription = (currentSection.description || "").trim().length > 0;
          const hasBullets = currentSection.bulletPoints && currentSection.bulletPoints.length > 0;
          if (hasDescription || hasBullets) {
            parsedContent.push(currentSection);
          }
        }

        // Extract and sanitize heading text
        let headingText = trimmedLine;
        
        if (trimmedLine.startsWith("##")) {
          headingText = trimmedLine.replace(/^#+\s/, "");
        } else if (trimmedLine.startsWith("#")) {
          headingText = trimmedLine.replace(/^#+\s/, "");
        } else if (trimmedLine.match(/^\*\*.*\*\*:?\*?\*?$/)) {
          headingText = trimmedLine.replace(/\*\*/g, "").replace(/:$/, "");
        }

        // Sanitize to remove Roman numerals / numeric prefixes
        headingText = sanitizeHeading(headingText);

        // Start new section
        currentSection = {
          heading: headingText,
          description: "",
          bulletPoints: [],
        };
      }
      // Check if it's a bullet point (*, -, or indented)
      else if (trimmedLine.match(/^[-•*]\s/) || line.match(/^\s+[-•*]\s/)) {
        // If no current section exists, create a default one
        if (!currentSection) {
          currentSection = {
            heading: "Summary Points",
            description: "",
            bulletPoints: [],
          };
        }
        
        const isNested = line.startsWith("    ") || line.startsWith("\t");
        let bulletText = trimmedLine.replace(/^[-•*]\s/, "");
        
        // Remove bold markers from bullet text
        bulletText = bulletText.replace(/\*\*/g, "");

        currentSection.bulletPoints.push({
          text: bulletText,
          isNested: isNested
        });
      }
      // It's description text
      else if (trimmedLine.length > 0) {
        // If no current section exists, create a default one
        if (!currentSection) {
          currentSection = {
            heading: "Summary",
            description: "",
            bulletPoints: [],
          };
        }
        
        currentSection.description += (currentSection.description ? " " : "") + trimmedLine;
      }
    }

    // Don't forget the last section (only if it has content)
    if (currentSection) {
      const hasDescription = (currentSection.description || "").trim().length > 0;
      const hasBullets = currentSection.bulletPoints && currentSection.bulletPoints.length > 0;
      if (hasDescription || hasBullets) {
        parsedContent.push(currentSection);
      }
    }

    return parsedContent;
  };

  // Handle Export to PDF with dynamic content
  const handleExportToPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Simulate PDF generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Prepare PDF data with dynamic lecture notes content
      const pdfData = {
        title: apiTitle || "Lecture Notes",
        size: formatFileSize(generateFullContentText().length)  , // You can calculate actual size if needed
        content: generateFullContentText(),
        summary: generateSummaryText(),
        keyPoints: generateKeyPoints(),
        transcription: generateFullContentText(), // Use full content as transcription
        createdAt: new Date().toISOString(),
        tag: "Lecture Notes"
      };
      
      // Store PDF data in Redux and navigate
      console.log("Storing PDF data in Redux:", pdfData);
      
      dispatch(setPdfViewData({
        pdfData: pdfData
      }));
      
      navigate('/popup/pdf-view');
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Generate full content text for PDF
  const generateFullContentText = (): string => {
    return content
      .map(item => {
        let sectionText = `${item.heading}\n`;
        if (item.description) {
          sectionText += `${item.description}\n`;
        }
        if (item.bulletPoints.length > 0) {
          sectionText += item.bulletPoints
            .map(point => `${point.isNested ? "    " : ""}• ${point.text}`)
            .join("\n");
        }
        return sectionText;
      })
      .join("\n\n");
  };

  // Generate summary text for PDF
  const generateSummaryText = (): string => {
    if (content.length === 0) return "No content available";
    
    // Use the first section's description as summary, or combine all descriptions
    const descriptions = content
      .map(item => item.description)
      .filter(desc => desc.trim().length > 0);
    
    if (descriptions.length > 0) {
      return descriptions.join(" ");
    }
    
    // Fallback to first section heading
    return content[0]?.heading || "file Summary";
  };

  // Generate key points for PDF
  const generateKeyPoints = (): string[] => {
    const allBulletPoints: string[] = [];
    
    content.forEach(item => {
      item.bulletPoints.forEach(point => {
        allBulletPoints.push(point.text);
      });
    });
    
    return allBulletPoints.length > 0 ? allBulletPoints : ["No key points available"];
  };

  // Handle Delete
  const handleDelete = () => {
  

    // Add your delete logic here
    
    navigate(-1);

  };

  // Handle Copy with improved functionality
  const handleCopyContent = async () => {
    try {
      const textToCopy = content
        .map(
          (item) =>
            `${item.heading}\n${item.description}\n${item.bulletPoints
              .map((point) => `${point.isNested ? "    " : ""}• ${point.text}`)
              .join("\n")}`
        )
        .join("\n\n");

      await navigator.clipboard.writeText(textToCopy);
      console.log("Content copied to clipboard");
      
      // Show success feedback (you can add a toast notification here)
      alert("Content copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = content
        .map(
          (item) =>
            `${item.heading}\n${item.description}\n${item.bulletPoints
              .map((point) => `${point.isNested ? "    " : ""}• ${point.text}`)
              .join("\n")}`
        )
        .join("\n\n");
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Content copied to clipboard!");
    }
  };

  // Toggle show more for specific section
  const toggleShowMore = (sectionIndex: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex]
    }));
  };

  // Handle back navigation
  const handleBack = () => {
    // Go back to Summary page retaining previous Redux state
    navigate(-1);
  };

  // Render bullet point with proper formatting
  const renderBulletPoint = (point: BulletPoint, index: number) => {
    // Split by colon to make the label bold
    const parts = point.text.split(':');
    const hasLabel = parts.length > 1;
    
    return (
      <li 
        key={index} 
        className={`flex items-start gap-2 ${point.isNested ? 'ml-6' : ''}`}
      >
        <span className="text-[#4B5563] mt-1 flex-shrink-0">•</span>
        <span className="text-[16px] font-[400] leading-[152%]">
          {hasLabel ? (
            <>
              <span className="text-[16px] font-[600] text-[#1F2937]">{parts[0]}:</span>
              <span className="text-[#4B5563]">{parts.slice(1).join(':')}</span>
            </>
          ) : (
            <span className="text-[#4B5563]">{point.text}</span>
          )}
        </span>
      </li>
    );
  };

  // Process API response data
  const processApiResponse = (apiResponse: any, actionTitle: string) => {
    console.log("Processing API response data...");
    setIsLoading(true);
    
    console.log("Received API Response:", apiResponse);
    console.log("Action Title:", actionTitle);
    
    // Extract the API title from action_details
    if (apiResponse?.data?.action_details?.title) {
      setApiTitle(apiResponse.data.action_details.title);
    }
    
    // Extract the content from API response - Updated to match your API structure
    let responseText = "";
    
    // Try different paths to find the content based on your API response structure
    if (apiResponse?.data?.action_result?.response_plain_text) {
      responseText = apiResponse?.data?.action_result?.response_plain_text;
    } else if (apiResponse?.data?.action_result?.response_body?.content) {
      responseText = apiResponse.data.action_result.response_body.content;
    } else if (apiResponse?.data?.content) {
      responseText = apiResponse.data.content;
    } else if (apiResponse?.content) {
      responseText = apiResponse.content;
    } else if (typeof apiResponse?.data === 'string') {
      responseText = apiResponse.data;
    } else if (typeof apiResponse === 'string') {
      responseText = apiResponse;
    } else {
      // Fallback: try to find any text content in the response
      responseText = JSON.stringify(apiResponse, null, 2);
    }
    
    console.log("Parsed response text:", responseText);
    
    // Parse the response content
    const parsedContent = parseContentFromResponse(responseText);
    console.log("Parsed content:", parsedContent);
    setContent(parsedContent);
    setData(apiResponse);
    setIsLoading(false);
  };

  // Simple useEffect that uses Redux data
  useEffect(() => {
    console.log("=== LectureNotePage useEffect triggered ===");
    console.log("Lecture notes data from Redux:", lectureNotesData);
    console.log("==========================================");
    
    if (lectureNotesData?.apiResponse) {
      processApiResponse(lectureNotesData.apiResponse, lectureNotesData.actionTitle);
    } else {
      console.log("No lecture notes data found in Redux, showing empty state");
      setContent([]);
      setIsLoading(false);
    }
  }, [lectureNotesData]);

  // Cleanup function to clear Redux data when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearLectureNotesData());
    };
  }, [dispatch]);

  console.log("99009900",content)

  if (isLoading) {
    return (
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8">
        <div className="text-center mt-20 text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Processing AI response...
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8">
        <div className="w-full mb-[2rem]">
          <BackButton handleBack={handleBack} />
        </div>
        <div className="text-center mt-20 text-gray-500">
          No lecture notes available. Please generate some content first.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8">
      <div className="w-full mb-[2rem]">
        <BackButton handleBack={handleBack} />
      </div>

      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>{""}</div>
          <Heading title={apiTitle} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <img src="/popup/3Dot.svg" alt="3Dot" className="w-8 h-8" />
            </button>

            <DropdownMenu
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              onExportPDF={handleExportToPDF}
              onDelete={handleDelete}
              onCopy={handleCopyContent}
              trianglePosition="right"
              width="w-44"
            />
          </div>
        </div>

        {/* PDF Generation Loader Overlay */}
        {isGeneratingPDF && (
          <Loader isLoading={isGeneratingPDF}/>
        )}

        {/* Content Sections */}
        <div className="space-y-6">
          {content.map((item, itemIndex) => (
            <div key={itemIndex}>
              {/* Section Heading */}
              <h2 className="text-[18px] font-[600] text-[#1F2937] mb-3">
                {item.heading}
              </h2>
              
              {/* Description */}
              {item.description && (
                <p className="text-[16px] font-[400] text-[#4B5563] leading-[152%] mb-4">
                  {item.description}
                </p>
              )}

              {/* Bullet Points - Only show if section is expanded */}
              {item.bulletPoints.length > 0 && expandedSections[itemIndex] && (
                <ul className="space-y-2 mb-6">
                  {item.bulletPoints.map((point, pointIndex) => renderBulletPoint(point, pointIndex))}
                </ul>
              )}

              {/* Show More/Less button for sections that have bullet points */}
              {item.bulletPoints.length > 0 && (
                <button 
                  onClick={() => toggleShowMore(itemIndex)}
                  className="text-[#3F7EF8] text-[16px] font-[600] underline mb-6 cursor-pointer"
                >
                  {expandedSections[itemIndex] ? "Show Less" : "Show More"}
                </button>
              )}

              {/* Separator Line - Don't show for last section */}
              {itemIndex !== content.length - 1 && (
                <div className="w-full h-[1px] bg-[rgba(189,212,255,0.5)] mb-4"></div>
              )}
            </div>
          ))}
        </div>

        {/* Share Button */}
        <div className="mt-4 px-8 w-full">
          <Button title="Share" onClick={handleCopyContent} />
        </div>
      </div>
    </div>
  );
}
