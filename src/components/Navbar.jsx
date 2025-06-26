import React from "react";
import latentNavLogo from "../assets/latentNavLogo.svg";
import { GoHomeFill } from "react-icons/go";
import { SlPuzzle } from "react-icons/sl";
import { HiMiniTrophy } from "react-icons/hi2";
import { IoSettingsOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import { getUserDetails } from "../api/api";
import useUserStore from "../store/userStore";
import { avatars } from "./Avatars";

export default function Navbar({
  
  path
}) {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [userDetails, setUserDetails] = React.useState(null);

  // Fetch user details when the component mounts
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

  // This component renders a sidebar navigation bar with links to Home, Problems, and Contests.
  return (
    <div className="navbar h-full w-[20%] bg-[#1A1A1A] flex flex-col p-6 justify-between transion-all duration-300">
      <div className="flex flex-col">
        <div className="logo mb-5">
          <img src={latentNavLogo} alt="Latent Logo" className="h-14 w-14" />
        </div>
        <div className="section-buttons flex flex-col gap-2">
          <Link to={'/home'} className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 ${path === '/home' ? 'bg-[#2A2A2A]' : ''} transion-all duration-300`}>
            <GoHomeFill className="text-white text-2xl mr-2 ml-2" />
            <p className="text-lg">Home</p>
          </Link>
          <Link to={'/problemset'} className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 ${path === '/problemset' ? 'bg-[#2A2A2A]' : ''} transion-all duration-300`}>
            <SlPuzzle className="text-white text-2xl mr-2 ml-2 " />
            <p className="text-lg">Problems</p>
          </Link>
          <Link to={'/contests'} className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 ${path === '/contests' ? 'bg-[#2A2A2A]' : ''} transion-all duration-300`}>
            <HiMiniTrophy className="text-white text-2xl mr-2 ml-2" />
            <p className="text-lg">Contests</p>
          </Link>
        </div>
      </div>
      <div className="end-section flex flex-col gap-2">
        <Link to={'/settings'} className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 transion-all duration-300 ${path === '/settings' ? 'bg-[#2A2A2A]' : ''}`}>
          <IoSettingsOutline className={`text-2xl mr-2 ${path === '/settings' ? 'text-white' : 'text-white/65'}`} />
          <p className={`text-lg ${path === '/settings' ? 'text-white' : 'text-white/65'}`}>Settings</p>
        </Link>
        <div className="h-[1px] bg-white opacity-10"></div>
        <Link to={`/user/${userDetails?.username}`} className={`flex flex-row justify-items-start items-center text-center p-1.5 text-white hover:bg-[#2A2A2A] rounded-lg cursor-pointer gap-2 transion-all duration-300 ${path === `/user/${userDetails?.username}` ? 'bg-[#2A2A2A]' : ''}`}>
          <img src={avatars[userDetails?.pfpId - 1] || null} alt="" className="h-10 w-10 rounded-full mr-2 bg-black" />
          <p className="text-lg">{userDetails?.username}</p>
        </Link>
      </div>
    </div>
  );
}
