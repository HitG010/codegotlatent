// iOS OAuth Utility Functions
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

export const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const isIOSSafari = () => {
  return isIOS() && isSafari();
};

// Check if localStorage is available (some iOS versions restrict it)
export const isLocalStorageAvailable = () => {
  try {
    const test = 'localStorage-test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

// Enhanced error handling for iOS
export const handleIOSAuthError = (error) => {
  console.log('iOS Auth Error:', error);
  
  if (isIOS()) {
    // Check for common iOS issues
    if (!isLocalStorageAvailable()) {
      return 'Local storage is disabled. Please enable it in your browser settings and try again.';
    }
    
    if (error?.response?.status === 401) {
      return 'Authentication failed. Please try again.';
    }
    
    if (error?.response?.status === 403) {
      return 'Authentication expired. Please log in again.';
    }
    
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    if (error?.message?.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }
    
    return 'Authentication failed on iOS device. Please ensure you have a stable internet connection and try again.';
  }
  
  return error?.response?.data?.message || error?.message || 'Authentication failed. Please try again.';
};

// Test iOS cookie support
export const testIOSCookieSupport = async () => {
  if (!isIOS()) return true;
  
  try {
    // Test if we can set and read a test cookie
    document.cookie = "ios-test=1; path=/; SameSite=None; Secure";
    const canReadCookie = document.cookie.includes('ios-test=1');
    
    // Clean up test cookie
    document.cookie = "ios-test=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    return canReadCookie;
  } catch (error) {
    return false;
  }
};
