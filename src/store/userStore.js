import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

const useUserStore = create(
    devtools(
        persist(
            (set) => ({
                user: null,
                accessToken: null,
                isAuthenticated: false,
                setUser: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
                clearUser: () => {
                    set({ user: null, accessToken: null, isAuthenticated: false });
                    localStorage.removeItem('user-storage'); // Clear persisted state from local storage
            },
            })
        )
    ),
    {
        name: 'user-storage', // unique name for the storage (must be unique across all stores)
        getStorage: () => localStorage, // (optional) by default the 'localStorage' is used
    }
);

export default useUserStore;