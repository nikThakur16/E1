import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFOptions {
  title: string;
  htmlContent: string;
  logoUrl?: string;
  companyName?: string;
  fileName?: string;
}

export const generatePDFFromHTML = async ({
  title,
  htmlContent,
  logoUrl = '/popup/logo.svg', // Default logo path
  companyName = 'SummarizeX',
  fileName = 'summary.pdf'
}: PDFOptions): Promise<void> => {
  try {
    // Create a temporary container for the PDF content
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.style.padding = '20mm';
    tempDiv.style.backgroundColor = '#ffffff';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    
    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create the HTML structure with logo, date, and content
    tempDiv.innerHTML = `
      <div style="
        max-width: 100%;
        margin: 0 auto;
        padding: 20px;
        background: #ffffff;
        font-family: 'Arial', 'Helvetica', sans-serif;
        color: #1F2937;
        line-height: 1.6;
      ">
        <!-- Header with Logo and Date -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #E5E7EB;
        ">
          <div style="display: flex; align-items: center; gap: 15px;">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 50px; width: auto;" />` : ''}
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1F2937;">${companyName}</h1>
          </div>
          <div style="text-align: right; color: #6B7280; font-size: 14px;">
            <div style="font-weight: 600; margin-bottom: 4px;">Generated on:</div>
            <div>${currentDate}</div>
          </div>
        </div>

        <!-- Title -->
        <h2 style="
          font-size: 28px;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 3px solid #3F7EF8;
        ">${title}</h2>

        <!-- HTML Content with Styling -->
        <div style="
          margin-top: 30px;
          color: #4B5563;
          font-size: 14px;
          line-height: 1.8;
        " id="pdf-content">
          ${htmlContent}
        </div>
      </div>
    `;

    // Add styles for HTML content
    const style = document.createElement('style');
    style.textContent = `
      #pdf-content h1, #pdf-content h2, #pdf-content h3, #pdf-content h4, #pdf-content h5, #pdf-content h6 {
        font-weight: 600;
        color: #1F2937;
        margin-top: 20px;
        margin-bottom: 12px;
        line-height: 1.4;
      }
      #pdf-content h1 { font-size: 24px; }
      #pdf-content h2 { font-size: 20px; }
      #pdf-content h3 { font-size: 18px; }
      #pdf-content h4 { font-size: 16px; font-weight: 600; }
      #pdf-content h5 { font-size: 15px; }
      #pdf-content h6 { font-size: 14px; }
      #pdf-content p {
        margin-bottom: 12px;
        line-height: 1.8;
        color: #4B5563;
      }
      #pdf-content strong, #pdf-content b {
        font-weight: 600;
        color: #1F2937;
      }
      #pdf-content ul, #pdf-content ol {
        margin-top: 12px;
        margin-bottom: 16px;
        padding-left: 30px;
      }
      #pdf-content ul {
        list-style-type: disc;
      }
      #pdf-content ol {
        list-style-type: decimal;
      }
      #pdf-content li {
        margin-bottom: 8px;
        line-height: 1.8;
        color: #4B5563;
      }
      #pdf-content li strong, #pdf-content li b {
        font-weight: 600;
        color: #1F2937;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(tempDiv);

    // Wait for images to load
    const images = tempDiv.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      return new Promise((resolve, reject) => {
        if (img.complete) {
          resolve(null);
        } else {
          img.onload = () => resolve(null);
          img.onerror = () => resolve(null); // Continue even if image fails
          setTimeout(() => resolve(null), 3000); // Timeout after 3 seconds
        }
      });
    });
    await Promise.all(imagePromises);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: tempDiv.offsetWidth,
      height: tempDiv.offsetHeight,
      allowTaint: true,
    });

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Handle multi-page PDF if content is too long
    if (imgHeight <= pageHeight) {
      // Content fits on one page
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      // Content spans multiple pages
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = -pageHeight + (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    // Clean up
    document.body.removeChild(tempDiv);
    document.head.removeChild(style);

    // Save PDF
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

