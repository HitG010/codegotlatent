import { getUserData } from "../api/api";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RatingGraph from "../components/RatingGraph";
import { avatars } from "../components/Avatars";
import { Mail, MapPin, PenToolIcon } from "lucide-react";
import useUserStore from "../store/userStore";
import Navbar from "../components/Navbar";

function User() {
  const { userName } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Fetching user data for:", userName);
        const data = await getUserData(userName);
        setUserData(data);
        console.log("User data fetched:", data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userName]);

  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  // if (!userData) {
  //   return <div>User not found</div>;
  // }

  return (
    <div className="h-screen w-100vh flex flex-col lg:flex-row justify-between bg-[#0F0F0F] scrollbar overflow-hidden">
      <Navbar path={`/user/${userName}`} />
      {loading && (
        <div className="flex items-center justify-center w-full h-full">
          <p className="text-white">Loading user data...</p>
        </div>
      )}
      {!loading && (
        <div className="flex flex-col items-center justify-start w-full h-full p-4 lg:p-10 pt-4 lg:pt-10 bg-[#0F0F0F] overflow-auto scrollbar pb-20 lg:pb-10">
          <div className="w-full flex flex-col lg:flex-row gap-4">
            <div className="bg-[#ffffff05] rounded-lg p-4 lg:p-6 max-w-full lg:max-w-[400px] border-1 border-[#ffffff10] flex flex-col items-start justify-start gap-4 lg:gap-8 h-fit w-full">
              <div className="flex flex-col sm:flex-row items-center lg:items-center justify-start gap-4 lg:gap-8 w-full">
                <img
                  src={avatars[userData.pfpId - 1]}
                  className="rounded-full w-20 h-20 lg:w-24 lg:h-24 flex items-center justify-center"
                ></img>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl lg:text-3xl font-semibold">
                    {userData.username}
                  </h1>
                  <p className="text-white/65">{userData.name}</p>
                </div>
              </div>
              <div className="flex flex-col justify-start gap-4 w-full">
                {user.username === userName && (
                  <Link
                    to={`/settings`}
                    className="text-black bg-white rounded-md font-medium px-3 py-2 text-center hover:bg-white/65 transition-all duration-300"
                  >
                    Edit Profile
                  </Link>
                )}
                <p className="text-white/65 flex items-center gap-2 lg:gap-4 text-sm lg:text-base">
                  <Mail className="w-4 h-4 lg:w-5 lg:h-5" /> {userData.email}
                </p>
                <p className="text-white/65 flex items-center gap-2 lg:gap-4 text-sm lg:text-base">
                  {" "}
                  <PenToolIcon className="w-4 h-4 lg:w-5 lg:h-5" />{" "}
                  {userData.Bio
                    ? userData.Bio.length > 100
                      ? userData.Bio.substring(0, 100) + "..."
                      : userData.Bio
                    : ""}
                </p>
                <p className="text-white/65 flex items-center gap-2 lg:gap-4 text-sm lg:text-base">
                  <MapPin className="w-4 h-4 lg:w-5 lg:h-5" /> {userData.Location}
                </p>
              </div>
            </div>
            <div className="bg-[#ffffff05] rounded-lg w-full border-1 border-[#ffffff10] flex flex-col justify-center gap-4 lg:gap-8 p-4 lg:p-6">
              {/* <h2 className="text-2xl font-semibold">Contest Ratings</h2> */}
              <div className="w-full flex flex-col justify-center items-start gap-4 lg:ml-[-25px]">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-4 lg:gap-0">
                  <div className="flex flex-col gap-0 text-white/65 lg:ml-16">
                    Contest Rating{" "}
                    <span className="text-2xl lg:text-3xl font-semibold text-white">
                      {userData.pastRatings[userData.pastRatings.length - 1]}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0 text-white/65 lg:ml-16">
                    Attended{" "}
                    <span className="text-2xl lg:text-3xl font-semibold text-white">
                      {userData.pastRatings.length}
                    </span>
                  </div>
                </div>
                <RatingGraph ratings={userData.pastRatings} />
              </div>
            </div>
          </div>
          <div className="mt-4 bg-[#ffffff08] rounded-lg p-2 lg:p-8 w-full border border-[#ffffff15]">
            <h2 className="text-xl lg:text-2xl font-semibold mb-2">Problems Solved</h2>
            <div className="grid grid-cols-4 gap-1 lg:gap-4">
              <div className="bg-[#ffffff05] border border-[#ffffff10] rounded-lg p-1 lg:p-4 text-center">
                <div className="text-green-400 font-semibold text-xs lg:text-sm mb-1">Easy</div>
                <div className="text-white text-sm lg:text-2xl font-bold mb-1">
                  {userData.problemCount.easyCount}
                </div>
                <div className="text-white/60 text-xs lg:text-sm">
                  of {userData.problemCount.totalEasyCount}
                </div>
              </div>
              
              <div className="bg-[#ffffff05] border border-[#ffffff10] rounded-lg p-1 lg:p-4 text-center">
                <div className="text-yellow-400 font-semibold text-xs lg:text-sm mb-1">Medium</div>
                <div className="text-white text-sm lg:text-2xl font-bold mb-1">
                  {userData.problemCount.mediumCount}
                </div>
                <div className="text-white/60 text-xs lg:text-sm">
                  of {userData.problemCount.totalMediumCount}
                </div>
              </div>
              
              <div className="bg-[#ffffff05] border border-[#ffffff10] rounded-lg p-1 lg:p-4 text-center">
                <div className="text-red-400 font-semibold text-xs lg:text-sm mb-1">Hard</div>
                <div className="text-white text-sm lg:text-2xl font-bold mb-1">
                  {userData.problemCount.hardCount}
                </div>
                <div className="text-white/60 text-xs lg:text-sm">
                  of {userData.problemCount.totalHardCount}
                </div>
              </div>
              
              <div className="bg-[#ffffff05] border border-[#ffffff10] rounded-lg p-1 lg:p-4 text-center">
                <div className="text-blue-400 font-semibold text-xs lg:text-sm mb-1">Submissions</div>
                <div className="text-white text-sm lg:text-2xl font-bold mb-1">
                  {userData.submissions.length}
                </div>
                <div className="text-white/60 text-xs lg:text-sm">
                  Total attempts
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-[#ffffff05] rounded-lg py-4 lg:py-6 px-2 lg:px-2 w-full border-1 border-[#ffffff10] flex flex-col justify-start gap-2">
            <h2 className="text-xl lg:text-2xl font-semibold px-4 mb-2">
              Submission History
            </h2>
            {userData.submissions.length > 0 ? (
              userData.submissions.map((submission, index) => (
                <Link
                  key={index}
                  className="text-white/65 hover:text-white hover:bg-[#ffffff03] px-4 py-1 rounded transition-all duration-300 border-b border-[#ffffff10]"
                  to={`/submission/${submission.id}`}
                  target="_blank"
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-0">
                    <span className="text-sm lg:text-lg font-semibold truncate max-w-[200px] lg:max-w-none">
                      {submission.problem.title}
                    </span>
                    <span
                      className={`text-${
                        submission.verdict === "Accepted"
                          ? "green-500 bg-green-500/10"
                          : "red-500 bg-red-500/10"
                      } rounded-full px-2 py-1 text-xs lg:text-sm flex-shrink-0`}
                    >
                      {submission.verdict}
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm truncate">
                    Submitted at:{" "}
                    {new Date(submission.createdAt).toLocaleString()}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-white/65">No submissions found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default User;
