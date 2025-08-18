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

// Enhanced iOS logout with comprehensive cleanup
export const performIOSLogout = () => {
  if (!isIOS()) return;
  
  try {
    // Clear all auth-related localStorage items
    const authKeys = ['ios-refresh-token', 'user-storage', 'accessToken'];
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove ${key}:`, e);
      }
    });
    
    // Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear sessionStorage:', e);
    }
    
    // Clear any remaining user-related data
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('user') || key.includes('auth') || key.includes('token'))) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove ${key}:`, e);
        }
      }
    }
    
    console.log('iOS logout cleanup completed');
  } catch (error) {
    console.error('Error during iOS logout cleanup:', error);
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

// Validate iOS refresh token
export const validateIOSRefreshToken = () => {
  if (!isIOS()) return true;
  
  try {
    const refreshToken = localStorage.getItem('ios-refresh-token');
    if (!refreshToken) return false;
    
    // Basic validation - check if it's a valid JWT-like structure
    const parts = refreshToken.split('.');
    return parts.length === 3;
  } catch (error) {
    return false;
  }
};
