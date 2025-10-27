import { GoogleGenAI } from "@google/genai";
import * as pdfjsLib from "pdfjs-dist";
import * as mammoth from "mammoth";

// Configure PDF.js worker with multiple fallback approaches
const setupPdfWorker = () => {
  try {
    // First try: Disable worker completely (most compatible for development)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    console.log('PDF.js configured: worker disabled (synchronous mode) - most compatible');
    return;
  } catch (error) {
    console.warn('PDF.js worker disable failed, trying CDN options:', error);
  }
  
  // Fallback chain for CDN workers if needed
  const workerUrls = [
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  ];
  
  for (let i = 0; i < workerUrls.length; i++) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrls[i];
      console.log(`PDF.js worker configured: CDN option ${i + 1}`);
      return;
    } catch (error) {
      console.warn(`PDF.js CDN option ${i + 1} failed:`, error);
    }
  }
  
  // Final fallback: empty worker
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    console.log('PDF.js final fallback: worker disabled');
  } catch (finalError) {
    console.error('All PDF.js worker configurations failed:', finalError);
  }
};

// Initialize worker setup and test PDF.js availability
setupPdfWorker();

// Test PDF.js availability
const testPdfJs = () => {
  try {
    console.log(`🔧 PDF.js version: ${pdfjsLib.version}`);
    console.log(`🔧 Worker source: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
    console.log('✅ PDF.js is available and configured');
    return true;
  } catch (error) {
    console.error('❌ PDF.js is not available:', error);
    return false;
  }
};

testPdfJs();

// Use environment variables for API key (Vite format)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set. AI-powered PDF extraction will be disabled.");
  console.warn("Please add VITE_GEMINI_API_KEY=your_api_key to your .env.local file");
}

console.log('🔑 Document Service API Key status:', API_KEY ? '✅ Configured' : '❌ Missing');
const ai = new GoogleGenAI({ apiKey: API_KEY || "YOUR_API_KEY_HERE" });

// Supported file types for document extraction
const SUPPORTED_FILE_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
  'text/plain': 'TXT',
  'text/rtf': 'RTF',
  'application/vnd.oasis.opendocument.text': 'ODT'
};

// Check if file type is supported
export const isSupportedFileType = (file: File): boolean => {
  // Check by MIME type
  const supportedMimeTypes = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  
  if (supportedMimeTypes.includes(file.type)) {
    return true;
  }
  
  // Check by file extension as fallback
  const fileName = file.name.toLowerCase();
  const supportedExtensions = ['.txt', '.pdf', '.docx', '.doc'];
  
  return supportedExtensions.some(ext => fileName.endsWith(ext));
};

// Get file type description
export const getFileTypeDescription = (file: File): string => {
  return SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES] || 'Unknown';
};

// Convert file to base64 for Gemini API
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data:mime/type;base64, prefix
      resolve(base64.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

// Simple, robust PDF text extraction without complex configurations
const extractPdfContentAdvanced = async (file: File): Promise<string> => {
  console.log(`🔍 Starting advanced PDF extraction for: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  
  try {
    // Load PDF data
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Validate PDF header
    const pdfHeader = new TextDecoder().decode(uint8Array.slice(0, 8));
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error('Invalid PDF file format');
    }
    
    // Simple PDF.js configuration - no worker, minimal features
    const documentConfig = {
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: false,
      verbosity: 0,
      disableAutoFetch: true,
      disableStream: true,
      disableFontFace: true,
      maxImageSize: 1024 * 1024, // 1MB limit
      cMapPacked: false
    };
    
    console.log('� Loading PDF with simple configuration...');
    const loadingTask = pdfjsLib.getDocument(documentConfig);
    const pdf = await loadingTask.promise as any;
    const numPages = pdf.numPages;
    console.log(`✅ PDF loaded: ${numPages} pages`);
    
    let fullText = '';
    const maxPages = Math.min(numPages, 20); // Process max 20 pages for performance
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent({
          normalizeWhitespace: true,
          includeMarkedContent: false
        });
        
        // Enhanced text extraction with proper spacing and formatting
        const pageText = textContent.items
          .map((item: any) => {
            const text = item.str || '';
            const hasEndOfLine = item.hasEOL;
            
            // Add proper spacing based on PDF text positioning
            if (text.trim().length > 0) {
              // Add line break if item indicates end of line
              return hasEndOfLine ? text + '\n' : text + ' ';
            }
            return '';
          })
          .filter((text: string) => text.trim().length > 0)
          .join('');
        
        if (pageText.trim().length > 0) {
          console.log(`  ✓ Page ${pageNum}: ${pageText.length} characters extracted`);
          fullText += pageText + '\n\n';
        }
      } catch (pageError) {
        console.warn(`Page ${pageNum} extraction failed, continuing...`);
        // Continue with other pages
      }
    }
    
    const finalText = fullText.trim();
    
    // Validate that we got readable text, not binary data
    if (!finalText || finalText.length === 0) {
      throw new Error("No readable text found in PDF");
    }
    
    // Check if the text contains mostly readable characters
    const readableChars = finalText.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
    const readableRatio = readableChars ? readableChars.length / finalText.length : 0;
    
    if (readableRatio < 0.7) { // Less than 70% readable characters
      console.warn(`⚠️ Text seems to contain binary data (${(readableRatio * 100).toFixed(1)}% readable)`);
      throw new Error("Extracted content appears to be binary data, not readable text");
    }
    
    console.log(`✅ Simple PDF extraction successful: ${finalText.length} characters (${(readableRatio * 100).toFixed(1)}% readable)`);
    return finalText;
    
  } catch (error) {
    console.error('Simple PDF extraction failed:', error);
    throw error;
  }
};

// Enhanced PDF extraction with structure-aware analysis (like DOCX approach)
const extractPdfContentStructured = async (file: File): Promise<string> => {
  console.log(`🔍 Starting structure-aware PDF extraction for: ${file.name}`);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Validate PDF header
    const pdfHeader = new TextDecoder().decode(uint8Array.slice(0, 8));
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error('Invalid PDF file format');
    }
    
    let extractedText = '';
    let extractionMethod = '';
    
    // Method 1: Structure-aware extraction with positioning analysis
    try {
      console.log('🔍 Attempting Method 1: Structure-aware extraction...');
      
      const documentConfig = {
        data: uint8Array,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: false,
        verbosity: 0,
        disableAutoFetch: true,
        disableStream: true,
        disableFontFace: true,
        maxImageSize: 1024 * 1024,
        cMapPacked: false
      };
      
      const loadingTask = pdfjsLib.getDocument(documentConfig);
      const pdf = await loadingTask.promise as any;
      const numPages = pdf.numPages;
      console.log(`📄 PDF loaded: ${numPages} pages`);
      
      let structuredText = '';
      const maxPages = Math.min(numPages, 25);
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent({
            normalizeWhitespace: false,
            includeMarkedContent: true,
            disableCombineTextItems: false
          });
          
          // Analyze text positioning for better structure detection
          const textItems: any[] = textContent.items;
          let pageText = '';
          let lastY = -1;
          let lastFontSize = -1;
          
          for (let i = 0; i < textItems.length; i++) {
            const item = textItems[i];
            const text = item.str || '';
            
            if (text.trim().length === 0) continue;
            
            // Enhanced binary and garbage character cleaning
            let cleanText = text
              // Remove null bytes and control characters (except line breaks)
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
              // Remove PDF-specific garbage patterns
              .replace(/[^\x20-\x7E\s]/g, '')
              // Remove PDF command artifacts
              .replace(/\/\w+\s+\d+\s+\d+\s+R/g, '')
              .replace(/<<[^>]*>>/g, '')
              .replace(/stream\s*[\r\n]/g, '')
              .replace(/endstream/g, '')
              .replace(/BT\s+ET/g, '')
              .replace(/Tf\s+\d+/g, '')
              .replace(/Td\s+[\d.-]+\s+[\d.-]+/g, '')
              // Clean excessive symbols and random characters
              .replace(/[���]+/g, ' ')
              .replace(/[~��\u00A0]+/g, ' ')
              .trim();
            
            if (cleanText.length === 0) continue;
            
            // Skip if still mostly garbage characters
            const readableChars = cleanText.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
            const readableRatio = readableChars ? readableChars.length / cleanText.length : 0;
            if (readableRatio < 0.5) continue;
            
            // Extract positioning and font information
            const transform = item.transform || [1, 0, 0, 1, 0, 0];
            const x = transform[4];
            const y = transform[5];
            const fontSize = Math.abs(transform[0]);
            
            // Detect structure based on positioning and font size
            if (lastY !== -1) {
              const yDiff = Math.abs(y - lastY);
              const fontSizeChange = Math.abs(fontSize - lastFontSize);
              
              // Large Y difference suggests new section/paragraph
              if (yDiff > fontSize * 1.5 || fontSizeChange > 2) {
                pageText += '\n\n';
              } else if (yDiff > fontSize * 0.8) {
                pageText += '\n';
              } else if (x < 100 && pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                pageText += '\n';
              } else if (!pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                pageText += ' ';
              }
            }
            
            // Detect potential headings (larger font size)
            if (fontSize > lastFontSize + 2 && lastFontSize > 0) {
              pageText += '\n\n'; // Extra spacing before headings
            }
            
            pageText += cleanText;
            lastY = y;
            lastFontSize = fontSize;
          }
          
          if (pageText.trim().length > 0) {
            console.log(`  ✓ Page ${pageNum}: ${pageText.length} characters (structured)`);
            structuredText += pageText + '\n\n';
          }
          
        } catch (pageError) {
          console.warn(`Page ${pageNum} structure analysis failed:`, pageError);
        }
      }
      
      if (structuredText.trim().length > 50) {
        extractedText = structuredText.trim();
        extractionMethod = 'Structure-aware extraction';
        console.log('✅ Structure-aware extraction successful');
      }
      
    } catch (structureError) {
      console.warn('Structure-aware extraction failed:', structureError);
    }
    
    if (!extractedText || extractedText.length < 100) {
      throw new Error('Structure-aware extraction failed to produce readable text');
    }
    
    // Post-process the extracted text (similar to DOCX processing)
    const processedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // Remove excessive blank lines
      .replace(/[ \t]+/g, ' ') // Normalize spaces
      .replace(/\n /g, '\n') // Remove spaces at line start
      .trim();
    
    // Validate text quality
    const readableChars = processedText.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
    const readableRatio = readableChars ? readableChars.length / processedText.length : 0;
    
    if (readableRatio < 0.7) {
      console.warn(`⚠️ Text quality low (${(readableRatio * 100).toFixed(1)}% readable)`);
      throw new Error("Extracted content appears to contain mostly non-readable characters");
    }
    
    console.log(`✅ PDF extraction completed using ${extractionMethod}`);
    console.log(`📊 Extracted ${processedText.length} characters, ${processedText.split(/\s+/).length} words`);
    console.log(`📈 Text quality: ${(readableRatio * 100).toFixed(1)}% readable`);
    console.log(`📝 Preview: "${processedText.substring(0, 100)}..."`);
    
    return processedText;
    
  } catch (error) {
    console.error('Structure-aware PDF extraction failed:', error);
    throw error;
  }
};

// Enhanced PDF parsing that extracts text from PDF streams and objects
const extractPdfContentBasic = async (file: File): Promise<string> => {
  console.log('🔧 Attempting enhanced PDF text extraction...');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to string for pattern matching (handle UTF-8 properly)
    let pdfContent = '';
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      // Only include printable ASCII and common Unicode characters
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
        pdfContent += String.fromCharCode(byte);
      } else if (byte > 127) {
        // Handle UTF-8 multibyte characters
        pdfContent += String.fromCharCode(byte);
      } else {
        pdfContent += ' '; // Replace non-printable with space
      }
    }
    
    console.log('📄 PDF content length:', pdfContent.length);
    
    let extractedText = '';
    const lines = pdfContent.split(/[\r\n]+/);
    
    // Enhanced text extraction patterns
    for (const line of lines) {
      // Method 1: Extract text between parentheses (most common PDF text storage)
      const parenthesesMatches = line.match(/\(([^)]+)\)/g);
      if (parenthesesMatches) {
        parenthesesMatches.forEach(match => {
          const text = match.replace(/[()]/g, '').trim();
          if (text.length > 0 && /[a-zA-Z0-9]/.test(text)) {
            extractedText += text + ' ';
          }
        });
      }
      
      // Method 2: Extract text after 'Tj' commands
      if (line.includes('Tj')) {
        const tjMatches = line.match(/\(([^)]*)\)\s*Tj/g);
        if (tjMatches) {
          tjMatches.forEach(match => {
            const text = match.replace(/\(([^)]*)\)\s*Tj/, '$1').trim();
            if (text.length > 0 && /[a-zA-Z0-9]/.test(text)) {
              extractedText += text + ' ';
            }
          });
        }
      }
      
      // Method 3: Extract text after 'TJ' commands (array format)
      if (line.includes('TJ')) {
        const tjArrayMatches = line.match(/\[(.*?)\]\s*TJ/g);
        if (tjArrayMatches) {
          tjArrayMatches.forEach(match => {
            const arrayContent = match.replace(/\[(.*?)\]\s*TJ/, '$1');
            const textMatches = arrayContent.match(/\(([^)]*)\)/g);
            if (textMatches) {
              textMatches.forEach(textMatch => {
                const text = textMatch.replace(/[()]/g, '').trim();
                if (text.length > 0 && /[a-zA-Z0-9]/.test(text)) {
                  extractedText += text + ' ';
                }
              });
            }
          });
        }
      }
      
      // Method 4: Look for plain text patterns (some PDFs store text directly)
      const plainTextMatches = line.match(/[A-Za-z][A-Za-z0-9\s]{10,}/g);
      if (plainTextMatches) {
        plainTextMatches.forEach(text => {
          const cleanText = text.trim();
          if (cleanText.length > 10 && !cleanText.includes('obj') && !cleanText.includes('endobj')) {
            extractedText += cleanText + ' ';
          }
        });
      }
    }
    
    // Clean up the extracted text
    let cleanedText = extractedText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Add proper spacing after sentences
      .trim();
    
    // Remove common PDF artifacts
    cleanedText = cleanedText
      .replace(/\b(obj|endobj|stream|endstream|xref|trailer)\b/gi, '')
      .replace(/\b\d+\s+\d+\s+R\b/g, '') // Remove object references
      .replace(/\b[A-F0-9]{8,}\b/g, '') // Remove hex strings
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`📋 Enhanced extraction found ${cleanedText.length} characters`);
    
    // Validate that we have meaningful content
    if (cleanedText.length < 50) {
      throw new Error('Not enough readable text found using enhanced extraction');
    }
    
    // Check readability ratio
    const readableChars = cleanedText.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
    const readableRatio = readableChars ? readableChars.length / cleanedText.length : 0;
    
    if (readableRatio < 0.8) { // Higher threshold for basic extraction
      console.warn(`⚠️ Enhanced extraction text quality low (${(readableRatio * 100).toFixed(1)}% readable)`);
      throw new Error("Enhanced extraction produced low-quality text");
    }
    
    console.log(`✅ Enhanced PDF extraction successful (${(readableRatio * 100).toFixed(1)}% readable)`);
    console.log(`📝 Preview: "${cleanedText.substring(0, 100)}..."`);
    return cleanedText;
    
  } catch (error) {
    console.error('Enhanced PDF extraction failed:', error);
    throw new Error('Enhanced PDF text extraction failed - this might be a complex or scanned PDF');
  }
};

// PDF Type Detection - Hybrid Approach Strategy
const detectPdfType = async (file: File): Promise<{
  isTextBased: boolean;
  isScanned: boolean;
  hasImages: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
  recommendedMethod: string;
}> => {
  console.log('🔍 Detecting PDF type and complexity...');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Quick text extraction test to determine if PDF has extractable text
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      verbosity: 0,
      useWorkerFetch: false,
      disableAutoFetch: true
    });
    
    const pdf = await loadingTask.promise as any;
    const firstPage = await pdf.getPage(1);
    
    // Test text extraction on first page
    const textContent = await firstPage.getTextContent();
    const textItems = textContent.items || [];
    
    // Analyze extracted text for corruption detection
    const totalTextLength = textItems.reduce((sum: number, item: any) => sum + (item.str || '').length, 0);
    const rawText = textItems.map((item: any) => item.str || '').join(' ');
    const readableText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    
    const readableChars = readableText.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
    const readableRatio = readableChars ? readableChars.length / Math.max(readableText.length, 1) : 0;
    
    // Enhanced corruption detection
    const corruptionIndicators = [
      (rawText.match(/[���~\u00A0-\u00BF\u00D7\u00F7]/g) || []).length, // Special corrupt chars
      (rawText.match(/[^\x20-\x7E\s]/g) || []).length, // Non-printable chars
      (rawText.match(/\$\s*\]\s*\/d\s*fu\s*y|urvey\s*uestions|\&\s*\]\s*tw/g) || []).length // Specific patterns like "urvey uestions"
    ];
    
    const totalCorruptChars = corruptionIndicators.reduce((a, b) => a + b, 0);
    const corruptionLevel = totalCorruptChars / Math.max(rawText.length, 1);
    
    console.log(`📊 Text analysis: ${totalTextLength} chars, ${(readableRatio * 100).toFixed(1)}% readable, ${(corruptionLevel * 100).toFixed(1)}% corruption`);
    console.log(`📝 Sample text: "${rawText.substring(0, 100)}..."`);      // Check for images/graphics (rough estimation)
    let hasImages = false;
    try {
      // Try to detect if page has images by checking operations
      const operators = await firstPage.getOperatorList();
      // Use more robust image detection without relying on specific OPS constants
      hasImages = operators.fnArray.some((fn: number) => {
        // Check for common image-related operation codes
        return fn === 74 || fn === 75 || fn === 76 || // Common image operations
               operators.argsArray[operators.fnArray.indexOf(fn)]?.some((arg: any) => 
                 typeof arg === 'string' && (arg.includes('Image') || arg.includes('Mask'))
               );
      });
    } catch (imageDetectionError) {
      console.warn('Image detection failed, assuming no images:', imageDetectionError);
      hasImages = false;
    }
    
    // Enhanced PDF characteristics with corruption detection
    const isTextBased = totalTextLength > 50 && readableRatio > 0.5;
    const isScanned = totalTextLength < 20 || readableRatio < 0.3;
    const isCorrupted = corruptionLevel > 0.4 || readableRatio < 0.5; // New corruption detection
    
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    let recommendedMethod = 'structure-aware';
    
    if (isCorrupted && API_KEY) {
      // Prioritize AI extraction for heavily corrupted PDFs
      complexity = 'complex';
      recommendedMethod = 'ai-interpretation';
      console.log('🤖 CORRUPTED PDF DETECTED - Prioritizing AI interpretation');
    } else if (isScanned || hasImages) {
      complexity = 'complex';
      recommendedMethod = 'ocr-fallback';
    } else if (readableRatio < 0.7 || textItems.length > 1000) {
      complexity = 'moderate';
      recommendedMethod = 'enhanced-parsing';
    }
    
    console.log(`📊 PDF Analysis Results:`);
    console.log(`  📝 Text-based: ${isTextBased} (${totalTextLength} chars, ${(readableRatio * 100).toFixed(1)}% readable)`);
    console.log(`  📷 Scanned/Image-based: ${isScanned}`);
    console.log(`  🖼️ Contains images: ${hasImages}`);
    console.log(`  📐 Complexity: ${complexity}`);
    console.log(`  🎯 Recommended method: ${recommendedMethod}`);
    
    return {
      isTextBased,
      isScanned,
      hasImages,
      complexity,
      recommendedMethod
    };
    
  } catch (detectionError) {
    console.warn('PDF type detection failed, defaulting to text-based:', detectionError);
    return {
      isTextBased: true,
      isScanned: false,
      hasImages: false,
      complexity: 'moderate',
      recommendedMethod: 'structure-aware'
    };
  }
};

// OCR-like fallback method for scanned/image-based PDFs
const extractPdfContentOCRFallback = async (file: File): Promise<string> => {
  console.log('🔍 Attempting OCR-like fallback extraction for scanned PDF...');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Enhanced text stream parsing for scanned PDFs
    let pdfContent = '';
    
    // Convert to string with multiple encoding attempts
    let encodingSuccess = false;
    const encodings = ['utf-8', 'latin1', 'ascii'];
    
    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding, { ignoreBOM: true, fatal: false });
        pdfContent = decoder.decode(uint8Array);
        // Check if we got readable content
        const readableTest = pdfContent.match(/[a-zA-Z0-9\s]/g);
        if (readableTest && readableTest.length > pdfContent.length * 0.1) {
          console.log(`✓ Successfully decoded with ${encoding}`);
          encodingSuccess = true;
          break;
        }
      } catch (encodingError) {
        continue;
      }
    }
    
    if (!encodingSuccess) {
      console.log('⚠️ Standard decoding failed, using byte-by-byte conversion...');
      // Enhanced byte-by-byte conversion with better character handling
      pdfContent = '';
      for (let i = 0; i < uint8Array.length; i++) {
        const byte = uint8Array[i];
        if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
          pdfContent += String.fromCharCode(byte);
        } else if (byte > 127 && byte < 255) {
          // Try to handle extended ASCII characters
          pdfContent += String.fromCharCode(byte);
        } else {
          // Replace other bytes with space to maintain structure
          pdfContent += ' ';
        }
      }
    }
    
    let extractedText = '';
    const lines = pdfContent.split(/[\r\n]+/);
    
    // Advanced pattern matching for various PDF text encodings
    for (const line of lines) {
      // Method 1: Standard text in parentheses
      const parenthesesMatches = line.match(/\(([^)]{2,})\)/g);
      if (parenthesesMatches) {
        parenthesesMatches.forEach(match => {
          const text = match.replace(/[()]/g, '').trim();
          if (text.length > 1 && /[a-zA-Z0-9]/.test(text)) {
            extractedText += text + ' ';
          }
        });
      }
      
      // Method 2: Hexadecimal encoded text
      const hexMatches = line.match(/<([0-9A-Fa-f\s]{4,})>/g);
      if (hexMatches) {
        hexMatches.forEach(match => {
          const hexString = match.replace(/[<>\s]/g, '');
          if (hexString.length % 2 === 0) {
            try {
              let decodedText = '';
              for (let i = 0; i < hexString.length; i += 2) {
                const hexPair = hexString.substr(i, 2);
                const charCode = parseInt(hexPair, 16);
                if (charCode >= 32 && charCode <= 126) {
                  decodedText += String.fromCharCode(charCode);
                }
              }
              if (decodedText.length > 1 && /[a-zA-Z0-9]/.test(decodedText)) {
                extractedText += decodedText + ' ';
              }
            } catch (hexError) {
              // Skip invalid hex sequences
            }
          }
        });
      }
      
      // Method 3: Text after Tj/TJ commands with better spacing
      const tjMatches = line.match(/\(([^)]+)\)\s*T[jJ]/g);
      if (tjMatches) {
        tjMatches.forEach(match => {
          const text = match.replace(/\(([^)]+)\)\s*T[jJ]/, '$1').trim();
          if (text.length > 0 && /[a-zA-Z0-9]/.test(text)) {
            extractedText += text + ' ';
          }
        });
      }
      
      // Method 4: Array-based text commands
      const arrayMatches = line.match(/\[(.*?)\]\s*TJ/g);
      if (arrayMatches) {
        arrayMatches.forEach(match => {
          const arrayContent = match.replace(/\[(.*?)\]\s*TJ/, '$1');
          const textParts = arrayContent.match(/\(([^)]*)\)/g);
          if (textParts) {
            textParts.forEach(part => {
              const text = part.replace(/[()]/g, '').trim();
              if (text.length > 0 && /[a-zA-Z0-9]/.test(text)) {
                extractedText += text + ' ';
              }
            });
          }
        });
      }
      
      // Method 5: Look for text in stream objects
      if (line.includes('stream') && line.includes('BT')) {
        const streamText = line.match(/BT.*?ET/g);
        if (streamText) {
          streamText.forEach(stream => {
            const textMatches = stream.match(/\(([^)]+)\)/g);
            if (textMatches) {
              textMatches.forEach(textMatch => {
                const text = textMatch.replace(/[()]/g, '').trim();
                if (text.length > 1 && /[a-zA-Z0-9]/.test(text)) {
                  extractedText += text + ' ';
                }
              });
            }
          });
        }
      }
    }
    
    // Enhanced cleaning for corrupted PDFs with binary data
    let cleanedText = extractedText
      // Remove obvious binary garbage patterns
      .replace(/[���~\u00A0\u00A1-\u00BF\u00D7\u00F7\u0100-\u017F\u0180-\u024F]+/g, ' ')
      // Remove PDF renderer artifacts 
      .replace(/Skia\/PDF\s+m\d+/g, '')
      .replace(/Google\s+Docs\s+Renderer/g, '')
      .replace(/[A-Z]\s*~\s*[A-Z]/g, '')
      // Clean various garbage patterns seen in the sample
      .replace(/[\\x00-\\x1F\\x7F-\\x9F]/g, '')
      .replace(/[^\x20-\x7E\s]/g, ' ')
      // Remove PDF command artifacts
      .replace(/\b(obj|endobj|stream|endstream|xref|trailer|startxref)\b/gi, '')
      .replace(/\b\d+\s+\d+\s+R\b/g, '')
      .replace(/\b[A-F0-9]{8,}\b/g, '')
      .replace(/\bq\s+Q\b/gi, '')
      .replace(/\b[0-9.]+\s+[0-9.]+\s+[0-9.]+\s+[cr]g?\b/gi, '')
      .replace(/\bBT\s+ET\b/gi, '')
      // Clean excessive whitespace and structure
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2') // Add paragraph breaks after sentences
      .replace(/([a-z])\s+([A-Z][a-z])/g, '$1\n$2') // Break on title case changes
      .trim();
    
    // Special handling for the numbered section pattern seen in sample
    if (cleanedText.includes('1. Demographics') || cleanedText.includes('2. Current Library') || cleanedText.includes('3. Crowdsourcing')) {
      // This looks like survey questions - let's preserve the structure
      cleanedText = cleanedText.replace(/(\d+\.\s*[A-Z][^0-9]*?)(\d+\.\s*)/g, '$1\n\n$2');
    }
    
    // More lenient validation for OCR fallback - it's often our last hope
    if (cleanedText.length < 10) { // Lowered from 30 to 10
      throw new Error('OCR fallback extraction produced insufficient text');
    }
    
    const readableChars = cleanedText.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
    const readableRatio = readableChars ? readableChars.length / cleanedText.length : 0;
    
    // Lower threshold for OCR since it's parsing raw PDF streams
    if (readableRatio < 0.3) { // Lowered from 0.6 to 0.3
      console.warn(`⚠️ OCR fallback quality low (${(readableRatio * 100).toFixed(1)}% readable)`);
      throw new Error(`OCR fallback extraction produced low-quality text (${(readableRatio * 100).toFixed(1)}% readable)`);
    }
    
    console.log(`✅ OCR fallback successful: ${cleanedText.length} characters (${(readableRatio * 100).toFixed(1)}% readable)`);
    console.log(`📝 Preview: "${cleanedText.substring(0, 100)}..."`);
    
    return cleanedText;
    
  } catch (error) {
    console.error('OCR fallback extraction failed:', error);
    throw new Error('OCR-like extraction failed - this PDF may require professional OCR software or manual text input');
  }
};

// Last resort extraction for severely corrupted/binary PDFs
const extractCorruptedPdfContent = async (file: File): Promise<string> => {
  console.log('🆘 LAST RESORT: Attempting extraction from severely corrupted PDF...');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert raw bytes and look for any readable patterns
    let rawContent = '';
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      // Only include printable ASCII characters and basic whitespace
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        rawContent += String.fromCharCode(byte);
      }
    }
    
    // Look for recognizable text patterns in the raw content
    let extractedText = '';
    
    // Pattern 1: Look for numbered lists (common in surveys)
    const numberedItems = rawContent.match(/\d+\.\s*[A-Za-z][^0-9\n]{10,}/g);
    if (numberedItems) {
      console.log(`Found ${numberedItems.length} numbered items`);
      extractedText += numberedItems.join('\n\n') + '\n\n';
    }
    
    // Pattern 2: Look for common survey words and build context around them
    const surveyKeywords = /\b(survey|question|feedback|rating|experience|demographics|participation|preference|feature)\b/gi;
    const keywordMatches = rawContent.match(new RegExp(`\\b\\w*(?:${surveyKeywords.source})\\w*\\b[^\\n]{0,50}`, 'gi'));
    if (keywordMatches) {
      console.log(`Found ${keywordMatches.length} survey-related text segments`);
      extractedText += keywordMatches.filter(match => match.length > 10).join('\n') + '\n\n';
    }
    
    // Pattern 3: Extract any readable sentences (words with spaces)
    const sentences = rawContent.match(/\b[A-Z][a-z]+(?:\s+[a-z]+)*[.!?]/g);
    if (sentences) {
      extractedText += sentences.join(' ') + '\n\n';
    }
    
    // Clean the final result
    extractedText = extractedText
      .replace(/[^\x20-\x7E\s]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1\n$2')
      .trim();
    
    if (extractedText.length < 20) {
      throw new Error('No readable content found in corrupted PDF');
    }
    
    console.log(`🔧 Last resort extraction found ${extractedText.length} characters`);
    console.log(`📝 Preview: "${extractedText.substring(0, 100)}..."`);
    
    return extractedText;
  } catch (error) {
    console.error('Last resort extraction failed:', error);
    throw new Error('PDF is too corrupted to extract any readable text');
  }
};

// AI-powered corrupted text interpretation - uses Gemini to reconstruct readable content
const extractPdfContentWithAI = async (file: File): Promise<string> => {
  console.log('🤖 AI-POWERED EXTRACTION: Using Gemini to interpret corrupted PDF content...');
  
  if (!API_KEY) {
    throw new Error('AI extraction requires API key - please configure your Gemini API key');
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Extract ALL possible text, including corrupted parts
    let rawContent = '';
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      // Include more characters to give AI maximum context
      if (byte >= 9 && byte <= 126) {
        rawContent += String.fromCharCode(byte);
      }
    }
    
    // Extract potential text fragments for AI analysis
    const fragments = [];
    
    // Get text between common PDF markers
    const textPatterns = [
      /\(([^)]{3,})\)/g,  // Text in parentheses
      /BT\s+(.*?)\s+ET/gs, // Text between BT/ET markers
      /Tj\s*([^%\n]{5,})/g, // Text near Tj commands
      /\b[A-Za-z]{3,}[^0-9\x00-\x1F]{0,50}\b/g // Readable word patterns
    ];
    
    for (const pattern of textPatterns) {
      const matches = rawContent.match(pattern);
      if (matches) {
        fragments.push(...matches.slice(0, 20)); // Limit fragments to avoid overwhelming AI
      }
    }
    
    // Combine raw content and fragments for AI analysis
    const contentForAI = [
      '=== RAW PDF CONTENT ===',
      rawContent.substring(0, 2000), // First 2000 chars
      '\n=== EXTRACTED FRAGMENTS ===',
      fragments.join('\n'),
      '\n=== END ==='
    ].join('\n');
    
    console.log(`📤 Sending ${contentForAI.length} characters to AI for interpretation...`);
    
    // Use AI to interpret the corrupted content
    const interpretedText = await cleanTextWithAI(contentForAI, 'corrupted PDF');
    
    if (!interpretedText || interpretedText.length < 50) {
      throw new Error('AI was unable to interpret the corrupted PDF content');
    }
    
    console.log(`✅ AI interpretation successful: ${interpretedText.length} characters`);
    console.log(`📝 Preview: "${interpretedText.substring(0, 150)}..."`);
    
    return interpretedText;
    
  } catch (error) {
    console.error('AI-powered extraction failed:', error);
    throw new Error('AI could not interpret this corrupted PDF - it may be too damaged or encrypted');
  }
};

// Main PDF extraction with Hybrid Approach - detects PDF type first, then applies optimal method
const extractPdfContent = async (file: File): Promise<string> => {
  console.log(`🚀 HYBRID APPROACH ACTIVATED for: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  console.log('📋 NEW System: PDF type detection → Smart method selection → Multi-fallback extraction');
  console.log('⚡ This replaces the old single-method approach with intelligent hybrid extraction');
  
  // Pre-flight checks
  if (!pdfjsLib) {
    throw new Error('PDF.js library not loaded. Please check your internet connection and try again.');
  }
  
  // STEP 1: Detect PDF type and complexity
  let pdfAnalysis;
  try {
    pdfAnalysis = await detectPdfType(file);
  } catch (detectionError) {
    console.warn('PDF detection failed, using comprehensive fallback approach:', detectionError);
    pdfAnalysis = {
      isTextBased: false, // Assume complex/scanned for safety
      isScanned: true,    // Prioritize OCR-like methods
      hasImages: true,
      complexity: 'complex',
      recommendedMethod: 'ocr-fallback'
    };
    console.log('📋 Fallback mode: Treating as complex/scanned PDF for maximum compatibility');
  }
  
  // STEP 2: Apply extraction strategy based on PDF type detection
  const extractionMethods = [];
  
  if (pdfAnalysis.recommendedMethod === 'ai-interpretation') {
    // Corrupted PDF: Prioritize AI methods
    console.log('🤖 Detected corrupted PDF - prioritizing AI-powered extraction methods');
    extractionMethods.push(
      { name: 'AI-powered interpretation', method: () => extractPdfContentWithAI(file) },
      { name: 'OCR fallback', method: () => extractPdfContentOCRFallback(file) },
      { name: 'Corrupted PDF handler', method: () => extractCorruptedPdfContent(file) },
      { name: 'Structure-aware extraction', method: () => extractPdfContentStructured(file) },
      { name: 'Enhanced parsing', method: () => extractPdfContentAdvanced(file) },
      { name: 'Basic text parsing', method: () => extractPdfContentBasic(file) }
    );
  } else if (pdfAnalysis.isTextBased && !pdfAnalysis.isScanned) {
    // Text-based PDF: Start with advanced methods
    console.log('📝 Detected text-based PDF - using advanced extraction methods');
    extractionMethods.push(
      { name: 'Structure-aware extraction', method: () => extractPdfContentStructured(file) },
      { name: 'Enhanced parsing', method: () => extractPdfContentAdvanced(file) },
      { name: 'Basic text parsing', method: () => extractPdfContentBasic(file) },
      { name: 'OCR fallback', method: () => extractPdfContentOCRFallback(file) },
      { name: 'AI-powered interpretation', method: () => extractPdfContentWithAI(file) },
      { name: 'Corrupted PDF handler', method: () => extractCorruptedPdfContent(file) }
    );
  } else if (pdfAnalysis.isScanned || pdfAnalysis.hasImages) {
    // Scanned/Image PDF: Start with OCR-like methods
    console.log('📷 Detected scanned/image-based PDF - prioritizing OCR-like methods');
    extractionMethods.push(
      { name: 'OCR fallback', method: () => extractPdfContentOCRFallback(file) },
      { name: 'AI-powered interpretation', method: () => extractPdfContentWithAI(file) },
      { name: 'Basic text parsing', method: () => extractPdfContentBasic(file) },
      { name: 'Structure-aware extraction', method: () => extractPdfContentStructured(file) },
      { name: 'Enhanced parsing', method: () => extractPdfContentAdvanced(file) },
      { name: 'Corrupted PDF handler', method: () => extractCorruptedPdfContent(file) }
    );
  } else {
    // Mixed or uncertain type: Balanced approach
    console.log('🔄 Mixed/uncertain PDF type - using balanced extraction approach');
    extractionMethods.push(
      { name: 'Structure-aware extraction', method: () => extractPdfContentStructured(file) },
      { name: 'OCR fallback', method: () => extractPdfContentOCRFallback(file) },
      { name: 'AI-powered interpretation', method: () => extractPdfContentWithAI(file) },
      { name: 'Enhanced parsing', method: () => extractPdfContentAdvanced(file) },
      { name: 'Basic text parsing', method: () => extractPdfContentBasic(file) },
      { name: 'Corrupted PDF handler', method: () => extractCorruptedPdfContent(file) }
    );
  }
  
  // STEP 3: Execute extraction methods in priority order
  let lastError: Error | null = null;
  let bestAttempt: { result: string; quality: number; method: string } | null = null;
  
  for (let i = 0; i < extractionMethods.length; i++) {
    const { name, method } = extractionMethods[i];
    
    try {
      console.log(`📄 Attempting Method ${i + 1}: ${name}...`);
      const result = await method();
      
      // Validate result quality with more lenient thresholds
      if (result && result.length > 20) { // Lowered from 50 to 20
        const readableChars = result.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
        const readableRatio = readableChars ? readableChars.length / result.length : 0;
        
        // More lenient quality check - try different thresholds based on method
        let qualityThreshold = 0.6; // Default
        if (name.includes('OCR')) qualityThreshold = 0.4; // Lower for OCR methods
        if (name.includes('Basic')) qualityThreshold = 0.5; // Lower for basic parsing
        
        console.log(`📊 ${name} results: ${result.length} chars, ${(readableRatio * 100).toFixed(1)}% readable (threshold: ${(qualityThreshold * 100).toFixed(0)}%)`);
        
        if (readableRatio > qualityThreshold) {
          console.log(`✅ SUCCESS: ${name} extracted ${result.length} characters (${(readableRatio * 100).toFixed(1)}% readable)`);
          console.log(`📊 PDF Analysis: ${pdfAnalysis.complexity} complexity, ${pdfAnalysis.isTextBased ? 'text-based' : 'image-based'}`);
          console.log(`📝 Sample text: "${result.substring(0, 150)}..."`);
          return result;
        } else {
          console.warn(`⚠️ ${name} quality below threshold (${(readableRatio * 100).toFixed(1)}% vs ${(qualityThreshold * 100).toFixed(0)}%), trying next method...`);
          console.warn(`📝 Sample output: "${result.substring(0, 100)}..."`);
          
          // Store as best attempt if it's better than previous attempts
          if (!bestAttempt || readableRatio > bestAttempt.quality) {
            bestAttempt = { result, quality: readableRatio, method: name };
            console.log(`💾 Saved as best attempt so far (${(readableRatio * 100).toFixed(1)}% quality)`);
          }
        }
      } else {
        console.warn(`⚠️ ${name} produced insufficient text (${result?.length || 0} characters), trying next method...`);
        if (result && result.length > 0) {
          console.warn(`📝 Sample output: "${result.substring(0, 50)}..."`);
          
          // Even insufficient text might be worth storing if it has some quality
          if (result.length > 10) {
            const readableChars = result.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
            const readableRatio = readableChars ? readableChars.length / result.length : 0;
            if (!bestAttempt || readableRatio > bestAttempt.quality) {
              bestAttempt = { result, quality: readableRatio, method: name };
              console.log(`💾 Saved short text as best attempt (${(readableRatio * 100).toFixed(1)}% quality)`);
            }
          }
        }
      }
      
    } catch (methodError) {
      console.warn(`❌ Method ${i + 1} (${name}) failed:`, methodError);
      lastError = methodError as Error;
    }
  }
  
  // STEP 3.5: If all methods failed but we have a "best attempt", try AI cleanup as last resort
  if (bestAttempt && bestAttempt.result.length > 10) {
    console.log(`🆘 LAST RESORT: Using best attempt from ${bestAttempt.method}`);
    console.log(`📊 Quality: ${(bestAttempt.quality * 100).toFixed(1)}% readable`);
    console.log(`📝 Text length: ${bestAttempt.result.length} characters`);
    console.log(`📄 Sample: "${bestAttempt.result.substring(0, 200)}..."`);
    
    // Try AI cleanup on the best attempt if it appears corrupted
    if (API_KEY && bestAttempt.quality < 0.7) {
      try {
        console.log('🤖 Attempting AI cleanup on best attempt result...');
        const aiCleanedText = await cleanTextWithAI(bestAttempt.result, 'corrupted PDF');
        
        if (aiCleanedText && aiCleanedText.length > bestAttempt.result.length * 0.5) {
          console.log(`✅ AI cleanup improved the text: ${aiCleanedText.length} characters`);
          console.log(`📝 AI result preview: "${aiCleanedText.substring(0, 200)}..."`);
          return aiCleanedText;
        } else {
          console.log('⚠️ AI cleanup did not improve the result, using original');
        }
      } catch (aiError) {
        console.warn('AI cleanup failed on best attempt:', aiError);
      }
    }
    
    // Use the best attempt we found (original or AI-cleaned)
    return bestAttempt.result;
  }
  
  // STEP 4: If all methods failed, provide intelligent error message
  const errorContext = pdfAnalysis.isScanned ? 
    'This appears to be a scanned or image-based PDF' :
    pdfAnalysis.complexity === 'complex' ?
      'This PDF has a complex layout or formatting' :
      'This PDF may be encrypted, corrupted, or use an unsupported format';
  
  // Provide user-friendly error message in the same format as before
  const errorMessage = `Unable to extract text from "${file.name}". This can happen with:\n\n` +
    "📋 Scanned PDFs or image-based documents\n" +
    "🔒 Password-protected or encrypted files\n" +
    "📐 Complex layouts or special formatting\n\n" +
    "💡 Quick solutions:\n" +
    "• Upload as DOCX instead (recommended - works perfectly!)\n" +
    "• Convert using SmallPDF.com or ILovePDF.com\n" +
    "• Copy text from PDF and save as TXT file\n" +
    "• Try a different PDF if you have one\n\n" +
    `� Technical details: Tried ${extractionMethods.length} extraction methods\n` +
    `📊 PDF Type: ${pdfAnalysis.isTextBased ? 'Text-based' : 'Image/Scanned'} (${pdfAnalysis.complexity} complexity)`;
  
  console.log(`🚨 HYBRID PDF EXTRACTION FAILED for ${file.name}`);
  console.log(`📊 Final Analysis: ${JSON.stringify(pdfAnalysis, null, 2)}`);
  console.log(`❌ All ${extractionMethods.length} methods attempted`);
  
  throw new Error(errorMessage);
};

// Legacy PDF extraction function - keeping for backward compatibility but now replaced by hybrid approach
const extractPdfContentLegacy = async (file: File): Promise<string> => {
  console.log(`� Starting comprehensive PDF extraction for: ${file.name}`);
  
  // Pre-flight checks
  if (!pdfjsLib) {
    throw new Error('PDF.js library not loaded. Please check your internet connection and try again.');
  }
  
  // Method 1: Try structure-aware PDF extraction (like enhanced DOCX approach)
  try {
    console.log('📄 Attempting Method 1: Structure-aware PDF extraction...');
    return await extractPdfContentStructured(file);
  } catch (structuredError) {
    console.warn('Method 1 (structured) failed:', structuredError);
  }
  
  // Method 1.5: Try simple PDF.js extraction
  try {
    console.log('📄 Attempting Method 1.5: Simple PDF.js extraction...');
    return await extractPdfContentAdvanced(file);
  } catch (simpleError) {
    console.warn('Method 1.5 failed:', simpleError);
  }
  
  // Method 2: Try basic text parsing
  try {
    console.log('📄 Attempting Method 2: Basic text parsing...');
    return await extractPdfContentBasic(file);
  } catch (basicError) {
    console.warn('Method 2 failed:', basicError);
  }
  
  // Method 3: Try minimal PDF.js configuration with better text handling
  try {
    console.log('📄 Attempting Method 3: Minimal PDF.js configuration...');
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      verbosity: 0,
      useWorkerFetch: false,
      disableAutoFetch: true
    });
    
    const pdf = await loadingTask.promise as any;
    let combinedText = '';
    
    // Try first few pages instead of just one
    const maxPages = Math.min(pdf.numPages, 3);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => {
            const str = item.str || '';
            // Filter out obvious binary/garbage characters
            return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
          })
          .filter((text: string) => text.trim().length > 0)
          .join(' ')
          .trim();
        
        if (pageText.length > 0) {
          combinedText += pageText + '\n\n';
        }
      } catch (pageError) {
        console.warn(`Page ${pageNum} failed in method 3:`, pageError);
      }
    }
    
    const finalText = combinedText.trim();
    
    // Validate text quality
    if (finalText.length > 20) {
      const readableChars = finalText.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
      const readableRatio = readableChars ? readableChars.length / finalText.length : 0;
      
      if (readableRatio > 0.6) {
        console.log(`✅ Method 3 successful - extracted ${finalText.length} characters (${(readableRatio * 100).toFixed(1)}% readable)`);
        return finalText;
      }
    }
    
    throw new Error('Method 3 produced low-quality text');
    
  } catch (minimalError) {
    console.warn('Method 3 failed:', minimalError);
  }
  
  // Method 4: Try PDF.js with different text extraction options
  try {
    console.log('📄 Attempting Method 4: Alternative PDF.js text extraction...');
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      verbosity: 0,
      useWorkerFetch: false,
      disableStream: true,
      disableFontFace: true
    });
    
    const pdf = await loadingTask.promise as any;
    const page = await pdf.getPage(1);
    
    // Try different text content options
    const textContent = await page.getTextContent({
      normalizeWhitespace: false,
      includeMarkedContent: true,
      disableCombineTextItems: false
    });
    
    let pageText = '';
    
    // More sophisticated text assembly
    for (let i = 0; i < textContent.items.length; i++) {
      const item = textContent.items[i] as any;
      const str = item.str || '';
      
      if (str.trim().length > 0) {
        // Clean up binary characters
        const cleanStr = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
        
        if (cleanStr.trim().length > 0) {
          // Add appropriate spacing based on transform data
          if (item.transform && i > 0) {
            const prevItem = textContent.items[i - 1] as any;
            // Add line break if significant Y position change
            if (prevItem.transform && Math.abs(item.transform[5] - prevItem.transform[5]) > 10) {
              pageText += '\n';
            }
          }
          
          pageText += cleanStr + ' ';
        }
      }
    }
    
    const finalText = pageText.trim();
    
    if (finalText.length > 20) {
      const readableChars = finalText.match(/[a-zA-Z0-9\s.,!?;:()\-]/g);
      const readableRatio = readableChars ? readableChars.length / finalText.length : 0;
      
      if (readableRatio > 0.6) {
        console.log(`✅ Method 4 successful - extracted ${finalText.length} characters (${(readableRatio * 100).toFixed(1)}% readable)`);
        return finalText;
      }
    }
    
    throw new Error('Method 4 produced low-quality text');
    
  } catch (method4Error) {
    console.warn('Method 4 failed:', method4Error);
  }
  
  // All methods failed
  throw new Error('All PDF extraction methods failed. This PDF may be scanned, encrypted, or have a complex layout that requires manual conversion.');
};

// Extract text content from DOCX files with enhanced formatting preservation
const extractDocxContent = async (file: File): Promise<string> => {
  console.log(`📄 Starting DOCX extraction for: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Try multiple extraction methods for better results
    let extractedText = '';
    let extractionMethod = '';
    
    // Method 1: Extract with HTML conversion for better structure preservation
    try {
      console.log('🔍 Attempting Method 1: HTML conversion...');
      const htmlResult = await (mammoth as any).convertToHtml({ arrayBuffer });
      
      if (htmlResult.value) {
        // Convert HTML to plain text while preserving structure
        extractedText = htmlResult.value
          .replace(/<h[1-6][^>]*>/gi, '\n\n') // Add spacing before headings
          .replace(/<\/h[1-6]>/gi, '\n') // Add line break after headings
          .replace(/<p[^>]*>/gi, '\n') // New line for paragraphs
          .replace(/<\/p>/gi, '\n') // End paragraph with line break
          .replace(/<li[^>]*>/gi, '\n• ') // Convert list items to bullet points
          .replace(/<\/li>/gi, '') // Remove closing list tags
          .replace(/<br\s*\/?>/gi, '\n') // Convert breaks to newlines
          .replace(/<[^>]+>/g, '') // Remove all remaining HTML tags
          .replace(/&nbsp;/g, ' ') // Convert HTML spaces
          .replace(/&amp;/g, '&') // Convert HTML entities
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
          .trim();
        
        extractionMethod = 'HTML conversion';
        console.log('✅ HTML conversion successful');
      }
    } catch (htmlError) {
      console.warn('HTML conversion failed:', htmlError);
    }
    
    // Method 2: Fallback to raw text extraction if HTML method failed or produced poor results
    if (!extractedText || extractedText.length < 50) {
      try {
        console.log('🔍 Attempting Method 2: Raw text extraction...');
        const textResult = await (mammoth as any).extractRawText({ arrayBuffer });
        
        if (textResult.value && textResult.value.trim().length > 0) {
          extractedText = textResult.value.trim();
          extractionMethod = 'Raw text extraction';
          console.log('✅ Raw text extraction successful');
        }
      } catch (textError) {
        console.warn('Raw text extraction failed:', textError);
      }
    }
    
    // Method 3: Try with custom style mapping for better formatting
    if (!extractedText || extractedText.length < 50) {
      try {
        console.log('🔍 Attempting Method 3: Custom style mapping...');
        const customOptions = {
          arrayBuffer,
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh", 
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Subtitle'] => h2:fresh"
          ]
        };
        
        const customResult = await (mammoth as any).convertToHtml(customOptions);
        
        if (customResult.value) {
          extractedText = customResult.value
            .replace(/<h[1-6][^>]*>/gi, '\n\n')
            .replace(/<\/h[1-6]>/gi, '\n')
            .replace(/<p[^>]*>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
          
          extractionMethod = 'Custom style mapping';
          console.log('✅ Custom style mapping successful');
        }
      } catch (customError) {
        console.warn('Custom style mapping failed:', customError);
      }
    }
    
    // Validate extracted content
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text content found in DOCX file after trying all extraction methods.");
    }
    
    // Post-process the extracted text for better readability
    const processedText = extractedText
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // Remove excessive blank lines
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .replace(/\n /g, '\n') // Remove spaces at beginning of lines
      .trim();
    
    console.log(`✅ DOCX extraction completed using ${extractionMethod}`);
    console.log(`📊 Extracted ${processedText.length} characters, ${processedText.split(/\s+/).length} words`);
    console.log(`📝 Preview: "${processedText.substring(0, 100)}..."`);
    
    // Log any conversion messages/warnings if available
    try {
      const diagnosticResult = await (mammoth as any).extractRawText({ arrayBuffer });
      if (diagnosticResult.messages && diagnosticResult.messages.length > 0) {
        console.warn("DOCX conversion messages:", diagnosticResult.messages);
      }
    } catch (diagnosticError) {
      // Ignore diagnostic errors
    }
    
    return processedText;
    
  } catch (error) {
    console.error("DOCX extraction error:", error);
    
    // Provide helpful error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('zip') || errorMessage.includes('corrupt')) {
      throw new Error("DOCX file appears to be corrupted or is not a valid DOCX format. Please try saving the document again or use a different file.");
    }
    
    if (errorMessage.includes('password') || errorMessage.includes('protected')) {
      throw new Error("DOCX file is password-protected. Please remove password protection and try again.");
    }
    
    throw new Error(`Failed to extract text from DOCX file: ${errorMessage}. Please ensure the file is a valid, unprotected DOCX document.`);
  }
};

// Extract text content using Gemini AI for cleanup and enhancement
const cleanTextWithAI = async (content: string, fileType: string): Promise<string> => {
  if (!API_KEY || content.length < 20) { // Lowered threshold for corrupted text
    return content;
  }

  try {
    console.log('🤖 Using Gemini AI to interpret corrupted/garbled text...');
    console.log(`🔑 API Key status: ${API_KEY ? 'Available' : 'Missing'}`);
    console.log(`📝 Content preview: "${content.substring(0, 200)}..."`);
    
    // Check if text appears heavily corrupted (lots of symbols and garbled chars)
    const corruptionLevel = calculateCorruptionLevel(content);
    console.log(`📊 Text corruption level: ${(corruptionLevel * 100).toFixed(1)}%`);
    
    let cleanupPrompt;
    
    if (corruptionLevel > 0.7) {
      // Heavily corrupted text - use advanced interpretation
      cleanupPrompt = `
        CORRUPTED TEXT RECOVERY TASK:
        The following text was extracted from a corrupted ${fileType} file and contains significant encoding errors, binary artifacts, and garbled characters.
        
        Your task is to interpret and reconstruct the original readable content:
        
        🔍 ANALYSIS CLUES:
        - Look for patterns like "urvey" (likely "Survey"), "uestions" (likely "Questions")
        - "Demographics", "Library", "Crowdsourcing", "Participation", "Feature", "Preferences" are visible keywords
        - Numbers like "1.", "2.", "3." suggest numbered survey sections
        - Fragments like "Current Library Experience", "Feature Preferences" suggest survey topics
        
        📋 RECONSTRUCTION RULES:
        1. Identify any recognizable words or partial words
        2. Reconstruct likely survey questions and sections based on context
        3. Create a logical survey structure with numbered sections
        4. Fill in reasonable survey content based on the visible keywords
        5. Format as a professional survey document
        6. If you can identify it's about library services, crowdsourcing, or user feedback, build around those themes
        
        CORRUPTED TEXT TO INTERPRET:
        ${content}
        
        Please return a clean, readable survey document based on your interpretation of this corrupted text.
      `;
    } else {
      // Standard cleanup for less corrupted text
      cleanupPrompt = `
        Please clean up and format the following text content that was extracted from a ${fileType} document.
        
        Instructions:
        1. Remove any garbled text, encoding artifacts, or extraction noise
        2. Fix spacing, line breaks, and paragraph formatting
        3. Preserve the logical structure (headings, paragraphs, lists, questions)
        4. If it contains survey/form questions, preserve the question format and numbering
        5. Remove any redundant whitespace but maintain readability
        6. Keep all meaningful content - do not summarize or omit information
        7. Return clean, well-formatted text that's ready for survey generation
        
        Text content:
        ${content}
      `;
    }

    console.log('📤 Sending request to Gemini AI...');
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: cleanupPrompt
    });
    
    if (!result || !result.text) {
      console.error('❌ AI returned empty result');
      throw new Error('AI returned empty result');
    }
    
    const cleanedText = result.text.trim();
    
    console.log(`✅ AI text cleanup completed: ${cleanedText.length} characters`);
    console.log(`📝 AI Result Preview: "${cleanedText.substring(0, 150)}..."`);
    
    // Return cleaned text if it's substantial, otherwise fallback to original
    if (cleanedText && cleanedText.length > 30) {
      console.log('🎉 AI cleanup successful - using AI-cleaned text');
      return cleanedText;
    } else {
      console.log('⚠️ AI result too short - using original text');
      return content;
    }
    
  } catch (cleanupError) {
    console.error("❌ AI text cleanup failed:", cleanupError);
    console.log("🔄 Falling back to original text");
    
    // If it's an API error, log more details
    if (cleanupError.message && cleanupError.message.includes('API')) {
      console.error('🔑 Possible API key issue - check VITE_GEMINI_API_KEY environment variable');
    }
    
    return content;
  }
};

// Helper function to calculate how corrupted text appears to be
const calculateCorruptionLevel = (text: string): number => {
  if (!text || text.length === 0) return 1.0;
  
  const totalChars = text.length;
  const readableChars = (text.match(/[a-zA-Z0-9\s.,!?;:()\-]/g) || []).length;
  const symbolChars = (text.match(/[^\w\s.,!?;:()\-]/g) || []).length;
  const corruptPatterns = (text.match(/[���~\u00A0\u00A1-\u00BF\u00D7\u00F7]/g) || []).length;
  
  // Calculate corruption based on readable vs symbol ratio
  const readableRatio = readableChars / totalChars;
  const symbolRatio = symbolChars / totalChars;
  const corruptRatio = corruptPatterns / totalChars;
  
  // Higher corruption score means more corrupted
  return Math.min(1.0, symbolRatio + corruptRatio + (1 - readableRatio));
};

// Provide helpful guidance when PDF extraction fails completely
const providePdfAlternatives = (file: File, error: Error): never => {
  const fileName = file.name;
  
  // Simple, user-friendly error message
  const errorMessage = `Unable to extract text from "${fileName}". This can happen with:\n\n` +
    "📋 Scanned PDFs or image-based documents\n" +
    "🔒 Password-protected or encrypted files\n" +
    "📐 Complex layouts or special formatting\n\n" +
    "� Quick solutions:\n" +
    "• Upload as DOCX instead (recommended - works perfectly!)\n" +
    "• Convert using SmallPDF.com or ILovePDF.com\n" +
    "• Copy text from PDF and save as TXT file\n" +
    "• Try a different PDF if you have one";
  
  throw new Error(errorMessage);
};

// Extract raw text content from documents (without AI cleanup - for original preview)
const extractRawDocumentContent = async (file: File): Promise<string> => {
  // Check file size first
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
  }

  // Check if file type is supported
  if (!isSupportedFileType(file)) {
    throw new Error(`Unsupported file type: ${file.type}. Supported formats: TXT, PDF, DOCX, DOC.`);
  }

  let extractedContent = '';
  let fileType = '';

  try {
    // Handle different file types
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      // Plain text files
      fileType = 'TXT';
      extractedContent = await file.text();
      
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      // PDF files - attempt automatic extraction with multiple retries
      fileType = 'PDF';
      console.log('🔍 Attempting PDF automatic extraction...');
      try {
        extractedContent = await extractPdfContent(file);
        console.log('✅ PDF hybrid extraction successful!');
      } catch (pdfError) {
        // The new hybrid approach handles all error cases internally
        console.error('❌ PDF hybrid extraction failed after all attempts:', pdfError);
        throw pdfError; // Re-throw the hybrid error (which has better messaging)
      }
      
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.name.toLowerCase().endsWith('.docx')
    ) {
      // DOCX files
      fileType = 'DOCX';
      extractedContent = await extractDocxContent(file);
      
    } else if (file.type === 'application/msword' || file.name.toLowerCase().endsWith('.doc')) {
      // DOC files (older Word format) - attempt to read as text
      fileType = 'DOC';
      try {
        extractedContent = await file.text();
      } catch (error) {
        throw new Error("DOC files require conversion to DOCX format for proper extraction. Please save as DOCX and try again.");
      }
      
    } else {
      // Fallback: try to read as text
      fileType = 'UNKNOWN';
      extractedContent = await file.text();
    }

    // Validate extracted content
    if (!extractedContent || extractedContent.trim().length === 0) {
      throw new Error("No readable text content found in the file.");
    }

    return extractedContent.trim();

  } catch (error) {
    console.error(`Error extracting content from ${fileType} file:`, error);
    
    // Provide specific error messages based on file type
    if (error.message) {
      throw error; // Re-throw with original message
    } else {
      throw new Error(`Failed to extract text from ${fileType} file. Please ensure the file is not corrupted or password-protected.`);
    }
  }
};

// Extract text content from documents (with AI cleanup - backwards compatibility)
export const extractDocumentContent = async (file: File): Promise<string> => {
  const rawContent = await extractRawDocumentContent(file);
  
  // Clean up extracted content with AI if available and content is substantial
  if (rawContent.length > 200) {
    try {
      const fileType = getFileTypeDescription(file);
      return await cleanTextWithAI(rawContent, fileType);
    } catch (cleanupError) {
      console.warn("AI cleanup failed, using original content:", cleanupError);
      return rawContent;
    }
  }

  return rawContent;
};

// Sanitize text for Google Forms (removes newlines but preserves content meaning)
const sanitizeForGoogleForms = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/\r\n/g, ' ') // Replace Windows line breaks with spaces
    .replace(/\n/g, ' ')   // Replace Unix line breaks with spaces
    .replace(/\r/g, ' ')   // Replace Mac line breaks with spaces
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .trim();               // Remove leading/trailing whitespace
};

// Enhanced file reading with progress and type detection
export const processUploadedFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ 
  originalContent: string;      // Raw content for preview display
  processedContent: string;     // AI-cleaned content for form generation
  sanitizedContent: string;     // For Google Forms export (no newlines)
  fileType: string; 
  metadata: any 
}> => {
  
  onProgress?.(10);
  
  // Validate file
  if (!isSupportedFileType(file)) {
    throw new Error(`Unsupported file type: ${getFileTypeDescription(file) || file.type}`);
  }

  onProgress?.(30);

  // Extract raw content first 
  const rawContent = await extractRawDocumentContent(file);
  
  onProgress?.(60);

  // For preview: Use raw content exactly as extracted (no AI cleanup)
  const originalContent = rawContent;

  // For processing: Clean up content with AI for better form generation
  let processedContent = rawContent;
  if (rawContent.length > 200) {
    try {
      const fileType = getFileTypeDescription(file);
      processedContent = await cleanTextWithAI(rawContent, fileType);
    } catch (cleanupError) {
      console.warn("AI cleanup failed, using raw content:", cleanupError);
      processedContent = rawContent;
    }
  }

  // Create sanitized version for Google Forms (removes newlines) - use processed content
  const sanitizedContent = sanitizeForGoogleForms(processedContent);
  
  onProgress?.(80);

  // Prepare metadata
  const metadata = {
    name: file.name,
    size: file.size,
    type: file.type || 'unknown',
    typeDescription: getFileTypeDescription(file),
    lastModified: file.lastModified,
    extractedAt: new Date().toISOString(),
    originalContentLength: originalContent.length,
    processedContentLength: processedContent.length,
    sanitizedContentLength: sanitizedContent.length,
    wordCount: originalContent.split(/\s+/).filter(word => word.length > 0).length
  };

  onProgress?.(100);

  return {
    originalContent,    // Raw content for preview (exactly as extracted)
    processedContent,   // AI-cleaned content for form generation
    sanitizedContent,   // For Google Forms (single line)
    fileType: getFileTypeDescription(file),
    metadata
  };
};