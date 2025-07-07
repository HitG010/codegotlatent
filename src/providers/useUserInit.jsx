import { useEffect } from "react";
import api from "../api/axios";
import useUserStore from "../store/userStore";

export const useUserInit = () => {
    const setUser = useUserStore((state) => state.setUser);
    const clearUser = useUserStore((state) => state.clearUser);
    const user = useUserStore((state) => state.user);
    const accessToken = useUserStore((state) => state.accessToken);

    console.log("User data:", user);
    console.log("Access Token:", accessToken);

    useEffect(() => {
        api.post("/auth/refresh-token", {
            withCredentials: true,
        })
            .then((response) => {
                console.log("Response from refresh-token:", response.data);
                const { accessToken, user } = response.data;
                console.log("User data:", user);
                console.log("Access Token:", accessToken);
                setUser(user, accessToken);
                console.log(useUserStore.getState().isAuthenticated, "isAuthenticated in useUserInit");
            })
            .catch((error) => {
                console.error("Error refreshing token:", error);
                clearUser();
            });
    }, []);
};
