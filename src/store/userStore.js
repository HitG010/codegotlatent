import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// Utility to detect iOS
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const useUserStore = create(
    devtools(
        persist(
            (set) => ({
                user: null,
                accessToken: null,
                refreshToken: null, // Add refresh token for iOS
                isAuthenticated: false,
                isIOSDevice: isIOS(),
                setUser: ({ user, accessToken, refreshToken }) => {
                    const updateData = { 
                        user, 
                        accessToken, 
                        isAuthenticated: true 
                    };
                    
                    // Store refresh token for iOS devices
                    if (isIOS() && refreshToken) {
                        updateData.refreshToken = refreshToken;
                        localStorage.setItem('ios-refresh-token', refreshToken);
                    }
                    
                    set(updateData);
                },
                clearUser: () => {
                    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
                    localStorage.removeItem('user-storage'); // Clear persisted state from local storage
                    localStorage.removeItem('ios-refresh-token'); // Clear iOS refresh token
                },
                getRefreshToken: () => {
                    if (isIOS()) {
                        return localStorage.getItem('ios-refresh-token');
                    }
                    return null; // For non-iOS, refresh token is in httpOnly cookie
                }
            }),
            {
                name: 'user-storage', // unique name for the storage (must be unique across all stores)
                getStorage: () => localStorage, // (optional) by default the 'localStorage' is used
            }
        )
    )
);

export default useUserStore;