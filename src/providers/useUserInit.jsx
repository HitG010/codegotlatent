import { useEffect } from "react";
import api from "../api/axios";
import useUserStore from "../store/userStore";

export const useUserInit = () => {
    const setUser = useUserStore((state) => state.setUser);
    const clearUser = useUserStore((state) => state.clearUser);
    const getRefreshToken = useUserStore((state) => state.getRefreshToken);
    const user = useUserStore((state) => state.user);
    const accessToken = useUserStore((state) => state.accessToken);
    const isIOSDevice = useUserStore((state) => state.isIOSDevice);

    console.log("User data:", user);
    console.log("Access Token:", accessToken);

    useEffect(() => {
        // Prepare request data for iOS devices
        const requestData = {};
        if (isIOSDevice) {
            const refreshToken = getRefreshToken();
            if (refreshToken) {
                requestData.refreshToken = refreshToken;
            }
        }

        api.post("/auth/refresh-token", requestData, {
            withCredentials: true,
        })
            .then((response) => {
                console.log("Response from refresh-token:", response.data);
                const { accessToken, user, refreshToken } = response.data;
                console.log("User data:", user);
                console.log("Access Token:", accessToken);
                // Always pass all three keys, even if refreshToken is undefined
                setUser({ user, accessToken, refreshToken });
                console.log(useUserStore.getState().isAuthenticated, "isAuthenticated in useUserInit");
            })
            .catch((error) => {
                console.error("Error refreshing token:", error);
                
                // Clear user data on refresh token failure
                clearUser();
                
                // Additional iOS cleanup on auth failure
                if (isIOSDevice) {
                    localStorage.removeItem('ios-refresh-token');
                    sessionStorage.clear();
                }
            });
    }, []);
};
