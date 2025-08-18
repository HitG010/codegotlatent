import useUserStore from "../store/userStore";

export function logout() {
    const resetUser = useUserStore.getState().clearUser;
    resetUser(); // Clear user data from store (this also clears iOS refresh token)
    
    // Clear any additional localStorage items
    localStorage.removeItem('user-storage');
    localStorage.removeItem('ios-refresh-token');
    
    // Clear any session storage
    sessionStorage.clear();
    
    window.location.href = "/login"; // Redirect to login page after logout
}