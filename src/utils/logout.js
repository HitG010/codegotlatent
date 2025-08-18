import useUserStore from "../store/userStore";
import axios from "axios";
import { isIOS } from "./iosAuth";

export async function logout() {
    const store = useUserStore.getState();
    const resetUser = store.clearUser;
    const getRefreshToken = store.getRefreshToken;
    
    try {
        // Attempt server logout
        const url = `${import.meta.env.VITE_BASE_URL}/auth/logout`;
        const requestData = {};
        
        // For iOS devices, include refresh token in request body
        if (isIOS()) {
            const refreshToken = getRefreshToken();
            if (refreshToken) {
                requestData.refreshToken = refreshToken;
            }
        }
        
        await axios.post(url, requestData, { 
            withCredentials: true,
            timeout: 5000 // Short timeout for logout
        });
        
        console.log("Server logout successful");
    } catch (error) {
        console.error("Server logout failed:", error);
        // Continue with local cleanup even if server fails
    }
    
    // Always clear local data regardless of server response
    resetUser(); // Clear user data from store (this also clears iOS refresh token)
    
    // Additional iOS cleanup
    if (isIOS()) {
        try {
            localStorage.removeItem('ios-refresh-token');
            sessionStorage.clear();
            
            // Clear any other iOS-specific storage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('user') || key.includes('auth') || key.includes('token'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn("Error clearing iOS storage:", e);
        }
    }
    
    // Clear any additional localStorage items
    try {
        localStorage.removeItem('user-storage');
    } catch (e) {
        console.warn("Error clearing user-storage:", e);
    }
    
    window.location.href = "/login"; // Redirect to login page after logout
}