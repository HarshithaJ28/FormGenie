import React from 'react';

interface PdfConversionHelperProps {
  fileName: string;
  onClose: () => void;
  onRetry: () => void;
}

const PdfConversionHelper: React.FC<PdfConversionHelperProps> = ({ fileName, onClose, onRetry }) => {
  const conversionTools = [
    {
      name: "SmallPDF",
      url: "https://smallpdf.com/pdf-to-word",
      description: "Free PDF to DOCX converter",
      icon: "🔄"
    },
    {
      name: "ILovePDF", 
      url: "https://www.ilovepdf.com/pdf_to_word",
      description: "Reliable online converter",
      icon: "💝"
    },
    {
      name: "PDF24",
      url: "https://tools.pdf24.org/en/pdf-to-word",
      description: "Free conversion tool",
      icon: "🛠️"
    }
  ];

  const handleOpenConverter = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📄 Convert PDF to DOCX
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>File:</strong> {fileName}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              PDF extraction is temporarily unavailable. Please convert to DOCX format for perfect processing!
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🔄 Online Converters (Recommended)</h4>
              <div className="space-y-2">
                {conversionTools.map((tool, index) => (
                  <button
                    key={index}
                    onClick={() => handleOpenConverter(tool.url)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{tool.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900">{tool.name}</div>
                        <div className="text-sm text-gray-600">{tool.description}</div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">📝 Alternative Methods</h4>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-1">Microsoft Word / Google Docs</div>
                  <div>1. Open PDF in Word or Google Docs</div>
                  <div>2. Save/Export as DOCX format</div>
                  <div>3. Upload the DOCX file</div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-1">Copy & Paste Method</div>
                  <div>1. Open PDF in any reader</div>
                  <div>2. Select all (Ctrl+A) and copy (Ctrl+C)</div>
                  <div>3. Create TXT file and paste content</div>
                  <div>4. Upload the TXT file</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfConversionHelper;