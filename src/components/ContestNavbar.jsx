import { Link, useLocation } from "react-router-dom";
import { HiMiniTrophy } from "react-icons/hi2";

export default function ContestNavbar({ contestId }) {
  const { pathname } = useLocation();

  return (
    <div className="justify-between items-center py-2 px-4 bg-[#1A1A1A] border-b border-[#ffffff15] z-50">
      <Link
        to={`/contest/${contestId}`}
        className={`flex items-center p-2 rounded-lg transition-all duration-300 ${
          pathname === `/contest/${contestId}` ? "bg-[#2A2A2A]" : ""
        }`}
      >
        <HiMiniTrophy className={`text-xl ${pathname === `/contest/${contestId}` ? "text-white" : "text-white/65"}`} />
        <span className={`text-xs mt-1 ${pathname === `/contest/${contestId}` ? "text-white" : "text-white/65"}`}>Contest</span>
      </Link>
    </div>
  );
}