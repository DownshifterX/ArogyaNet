/**
 * Utility for viewing/downloading documents with Android browser compatibility
 */

/**
 * Checks if the current device is likely an Android device
 */
export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Checks if the current browser is mobile
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Opens or downloads a document in a way that's compatible with Android browsers
 * 
 * @param blob - The document blob to view/download
 * @param filename - The filename to use for download
 * @param mimeType - The MIME type of the document
 */
export function viewDocument(blob: Blob, filename: string, mimeType?: string): void {
  const android = isAndroid();
  const mobile = isMobile();
  
  // For Android or mobile, prefer download with proper filename
  // This avoids popup blockers and blob URL issues
  if (android || mobile) {
    downloadDocument(blob, filename);
  } else {
    // Desktop: try to open in new tab
    try {
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, '_blank');
      
      // Fallback to download if popup was blocked
      if (!opened || opened.closed || typeof opened.closed === 'undefined') {
        console.log('Popup blocked, falling back to download');
        downloadDocument(blob, filename);
      } else {
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (error) {
      console.error('Error opening document:', error);
      downloadDocument(blob, filename);
    }
  }
}

/**
 * Downloads a document with proper filename
 * Works reliably on Android and all browsers
 * 
 * @param blob - The document blob to download
 * @param filename - The filename to use
 */
export function downloadDocument(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL after download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Opens a URL in a new tab with Android compatibility
 * Falls back to same-tab navigation if popup is blocked
 * 
 * @param url - The URL to open
 * @param filename - Optional filename for fallback download
 */
export function openUrl(url: string, filename?: string): void {
  const android = isAndroid();
  
  if (android) {
    // Android: direct navigation is more reliable than window.open
    // User can use back button to return
    window.location.href = url;
  } else {
    const opened = window.open(url, '_blank');
    
    // Fallback if popup blocked
    if (!opened || opened.closed || typeof opened.closed === 'undefined') {
      console.log('Popup blocked, navigating in same tab');
      window.location.href = url;
    }
  }
}

/**
 * Checks if a file type can be viewed inline in browsers
 * 
 * @param mimeType - The MIME type to check
 */
export function canViewInline(mimeType?: string): boolean {
  if (!mimeType) return false;
  
  const viewableTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'text/plain',
    'text/html',
    'text/csv',
  ];
  
  return viewableTypes.some(type => mimeType.toLowerCase().includes(type.toLowerCase()));
}

/**
 * Gets a user-friendly action name based on file type and device
 * 
 * @param mimeType - The MIME type of the document
 */
export function getViewActionText(mimeType?: string): string {
  const android = isAndroid();
  const canView = canViewInline(mimeType);
  
  if (android || !canView) {
    return 'Download';
  }
  
  return 'View';
}
