import React from 'react'
import { getUserDetails, unregisterUser } from "../api/api";
import useUserStore from "../store/userStore";
import axios from 'axios';

function Settings() {
const user = useUserStore((state) => state.user);
console.log('user in settings', user);
const [userDetails, setUserDetails] = React.useState(null);
React.useEffect(() => {
    const fetchUserDetails = async () => {
        try {
            const details = await getUserDetails(user.id);
            setUserDetails(details);
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    };
    fetchUserDetails();
}, [user.id]);

const handleChange = (e) => {
    const { name, value } = e.target;
    setUserDetails((prev) => ({
        ...prev,
        [name]: value,
    }));
};

const handleLogout = () => {
    // Add logout logic here
    const url = `${import.meta.env.VITE_BASE_URL}/auth/logout`;
    axios.post(url, {}, { withCredentials: true })
        .then(() => {
            user.clearUser(); // Clear user state in the store
            window.location.href = '/login'; // Adjust the path as needed
            alert('Logged out!');
        })
        .catch((error) => {
            console.error('Error logging out:', error);
        });
};

return (
    <div>
        <h2>Settings</h2>
        <form>
            <div>
                <label>
                    Username:
                    <input
                        type="text"
                        name="username"
                        value={userDetails ? userDetails.username : ""}
                        onChange={handleChange}
                        // placeholder="Enter your username"
                        disabled = {true}
                    />
                </label>
            </div>
            <div>
                <label>
                    Email:
                    <input
                        type="email"
                        name="email"
                        value={userDetails ? userDetails.email : ""}
                        onChange={handleChange}
                        // placeholder="Enter your email"
                        disabled = {true}
                    />
                </label>
            </div>
        </form>
        <button onClick={handleLogout}>Logout</button>
    </div>
)
}

export default Settings
