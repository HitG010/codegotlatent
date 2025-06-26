import React from 'react'
import { getUserDetails, unregisterUser } from "../api/api";
import useUserStore from "../store/userStore";
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import { ExternalLink, Pencil, Check } from 'lucide-react';

function Settings() {
const user = useUserStore((state) => state.user);
const clearUser = useUserStore((state) => state.clearUser);
console.log('user in settings', user);
const [userDetails, setUserDetails] = React.useState(null);
const [editField, setEditField] = React.useState({
    username: true,
    fullName: true,
    bio: true,
    location: true,
});
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
            clearUser(); // Clear user state in the store
            window.location.href = '/login'; // Adjust the path as needed
            alert('Logged out!');
        })
        .catch((error) => {
            console.error('Error logging out:', error);
        });
};

return (
    <div  className="h-screen w-100vh flex flex-row justify-between bg-[#0F0F0F] overflow-hidden scrollbar">
        <Navbar />
        <div className="home flex flex-col h-full w-[80%] p-10 pt-16 bg-[#0F0F0F] overflow-auto scrollbar">
        <h2 className="text-white text-4xl font-semibold">Settings</h2>
        <div className='mt-8 flex gap-16'>
            <img src={userDetails?.avatar || ''} alt="User Avatar" className="h-24 w-24 rounded-full bg-[#ffffff20]"/>
            <div>
                <p className="text-white text-sm text-white/65">Username</p>
                <p className="text-white text-2xl font-semibold">{userDetails?.username}</p>
                {/* <p className="text-white text-sm text-white/65">Email</p>
                <p className="text-white text-xl font-semibold">{userDetails?.email}</p> */}
                <Link to={`/user/${userDetails?.username}`} className="hover:bg-white/65 mt-2 px-2 py-1 bg-white text-black font-medium text-sm flex items-center justify-center gap-2 rounded rounded-md transition-all duration-300">View Profile <ExternalLink className='w-3 h-3'/></Link>
            </div>
        </div>
        <div className='mt-8 flex flex-col gap-3 px-8 py-6 bg-[#1a1a1a] rounded-lg border border-[#ffffff15]'>
            <h2 className="text-white text-2xl font-medium">Account Information</h2>
            <div className='grid grid-cols-5 gap-1 items-center'>
                <h2 className="text-white/65 text-lg font-medium">Username</h2>
                <div className='flex gap-2 col-span-4'>
                    <input
                        type="text"
                        name="username"
                        value={userDetails?.username || ''}
                        onChange={handleChange}
                        className="p-2 w-full focus:bg-[#ffffff10] text-white rounded border border-[#ffffff20]"
                        disabled = {editField.username} // Disable input for username
                    />
                    <button
                        onClick={() => {
                            // Add logic to update username
                            setEditField((prev) => ({ ...prev, username: !prev.username }));
                            if( editField.username == false) {
                                // Logic to save the username
                                alert('Username updated!');
                            }
                        }}
                        className="bg-white text-black py-1 px-3 rounded hover:bg-white/65 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {(editField.username == false) ? <>Save <Check className='w-3 h-3 inline' /></> : <>Edit <Pencil className='w-3 h-3 inline' /></>}
                    </button>
                </div>
                <h2 className="text-white/65 text-lg font-medium">Email</h2>
                <div className='flex gap-2 col-span-4'>
                    <input
                        type="email"
                        name="email"
                        value={userDetails?.email || ''}
                        onChange={handleChange}
                        className="py-1 px-2 w-full focus:bg-[#ffffff10] text-white rounded border border-[#ffffff20]"
                        disabled
                    />
                    {/* <button
                        onClick={() => {
                            // Add logic to update email
                            alert('Email updated!');
                        }}
                        className="bg-white text-black py-1 px-3 rounded hover:bg-white/65 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        Edit <Pencil className='w-3 h-3 inline' />
                    </button> */}
                </div>
                <h2 className="text-white/65 text-lg font-medium">Password</h2>
                <div className='flex gap-2 col-span-4'>
                    {/* <input
                        type="password"
                        name="password"
                        placeholder="Change Password"
                        className="p-2 w-full focus:bg-[#ffffff10] text-white rounded border border-[#ffffff20]"
                    />
                    <button
                        onClick={() => {
                            // Add logic to update password
                            alert('Password updated!');
                        }}
                        className="bg-white text-black py-1 px-3 rounded hover:bg-white/65 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        Change <Pencil className='w-3 h-3 inline' />
                    </button> */}
                    <Link to="/forgot-password" className="text-blue-500 hover:underline">Click to change password</Link>
                </div>
            </div>


            <h2 className="text-white text-2xl font-medium mt-4">Basic Information</h2>
            <div className='grid grid-cols-5 gap-1 items-center'>
                <h2 className="text-white/65 text-lg font-medium">Full Name</h2>
                <div className='flex gap-2 col-span-4'>
                    <input
                        type="text"
                        name="fullName"
                        value={userDetails?.fullName || ''}
                        onChange={handleChange}
                        className="p-2 w-full focus:bg-[#ffffff10] text-white rounded border border-[#ffffff20]"
                    />
                    <button
                        onClick={() => {
                            // Add logic to update full name
                            alert('Full Name updated!');
                        }}
                        className="bg-white text-black py-1 px-3 rounded hover:bg-white/65 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        Edit <Pencil className='w-3 h-3 inline' />
                    </button>
                </div>
                <h2 className="text-white/65 text-lg font-medium">Bio</h2>
                <div className='flex gap-2 col-span-4'>
                    <textarea
                        name="bio"
                        value={userDetails?.bio || ''}
                        onChange={handleChange}
                        className="p-2 w-full focus:bg-[#ffffff10] text-white rounded border border-[#ffffff20]"
                        rows="3"
                    />
                    <button
                        onClick={() => {
                            // Add logic to update bio
                            alert('Bio updated!');
                        }}
                        className="bg-white text-black py-1 px-3 rounded hover:bg-white/65 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        Edit <Pencil className='w-3 h-3 inline' />
                    </button>
                </div>
                <h2 className="text-white/65 text-lg font-medium">Location</h2>
                <div className='flex gap-2 col-span-4'>
                    <input
                        type="text"
                        name="location"
                        value={userDetails?.location || ''}
                        onChange={handleChange}
                        className="p-2 w-full focus:bg-[#ffffff10] text-white rounded border border-[#ffffff20]"
                    />
                    <button
                        onClick={() => {
                            // Add logic to update location
                            alert('Location updated!');
                        }}
                        className="bg-white text-black py-1 px-3 rounded hover:bg-white/65 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        Edit <Pencil className='w-3 h-3 inline' />
                    </button>
                </div>
                {/* <h2 className="text-white/65 text-lg font-medium">Website</h2> */}
                {/* <div className='flex gap-2 col-span-4'>
                    <input
                        type="url"
                        name="website"
                        value={userDetails?.website || ''}
                        onChange={handleChange}
                        className="p-2 w-full focus:bg-[#ffffff10] text-white rounded border border-[#ffffff20]"
                    />
                    <button
                        onClick={() => {
                            // Add logic to update website
                            alert('Website updated!');
                        }}
                        className="bg-white text-black py-1 px-3 rounded hover:bg-white/65 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        Edit <Pencil className='w-3 h-3 inline' />
                    </button>
                </div> */}

            </div>


            <h2 className="text-white text-2xl font-medium mt-4">Additional Settings</h2>
            <div className='grid grid-cols-5 gap-1 items-center '>
                <h2 className="text-white/65 text-lg font-medium col-span-4">Allow Email Notifications for Upcoming Contests</h2>
                <div className='flex gap-2 col-span-1'>
                    <input
                        type="checkbox"
                        name="emailNotifications"
                        checked={userDetails?.emailNotifications || false}
                        onChange={(e) => {
                            setUserDetails((prev) => ({
                                ...prev,
                                emailNotifications: e.target.checked,
                            }));
                            // Add logic to update email notifications preference
                            alert('Email Notifications preference updated!');
                        }}
                        className="w-5 h-5"
                    />
                </div>
                <h2 className="text-white/65 text-lg font-medium col-span-4">Logout</h2>
                <div className='flex gap-2 col-span-1'>
                    <button onClick={handleLogout} className='mt-8 bg-red-500 text-white py-2 px-4 rounded w-fit'>Logout</button>
                </div>
            </div>
            {/* <div>
                <h2 className="text-white text-2xl font-semibold">Basic Info</h2>
                <p className="text-white text-sm text-white/65">Username</p>
                <p className="text-white text-2xl font-semibold">{userDetails?.username}</p>
                <p className="text-white text-sm text-white/65">Email</p>
                <p className="text-white text-xl font-semibold">{userDetails?.email}</p>
            </div> */}
        </div>
        {/* <button onClick={handleLogout} className='mt-8 bg-red-500 text-white py-2 px-4 rounded w-fit'>Logout</button> */}
        </div>
    </div>
)
}

export default Settings
