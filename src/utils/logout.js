import useUserStore from "../store/userStore";

export function logout() {
    const resetUser = useUserStore.getState().clearUser;
    resetUser(); // Clear user data from store
    useStore.persist.clearStorage(); // Clear persisted state from local storage
    window.location.href = "/login"; // Redirect to login page after logout
}