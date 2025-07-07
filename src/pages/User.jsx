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
    <div className="h-screen w-100vh flex flex-row justify-between bg-[#0F0F0F] scrollbar overflow-hidden">
      <Navbar path={`/user/${userName}`} />
      {loading && (
        <div className="flex items-center justify-center w-full h-full">
          <p className="text-white">Loading user data...</p>
        </div>
      )}
      {!loading && (
        <div className="flex flex-col items-center justify-start w-full h-full p-10 pt-10 bg-[#0F0F0F] overflow-auto scrollbar">
          <div className="w-full flex gap-4">
            <div className="bg-[#ffffff05] rounded-lg p-6 max-w-[400px] border-1 border-[#ffffff10] flex flex-col items-start justify-start gap-8 h-fit w-full">
              <div className="flex items-center justify-start gap-8">
                <img
                  src={avatars[userData.pfpId - 1]}
                  className="rounded-full w-24 h-24 flex items-center justify-center"
                ></img>
                <div>
                  <h1 className="text-3xl font-semibold">
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
                <p className="text-white/65 flex items-center gap-4">
                  <Mail className="w-5 h-5" /> {userData.email}
                </p>
                <p className="text-white/65 flex items-center gap-4">
                  {" "}
                  <PenToolIcon className="w-5 h-5" />{" "}
                  {userData.Bio?.substring(0, 70)}...{" "}
                </p>
                <p className="text-white/65 flex items-center gap-4">
                  <MapPin className="w-5 h-5" /> {userData.Location}
                </p>
              </div>
            </div>
            <div className="bg-[#ffffff05] rounded-lg w-full border-1 border-[#ffffff10] flex flex-col justify-center gap-8">
              {/* <h2 className="text-2xl font-semibold">Contest Ratings</h2> */}
              <div className="w-full flex flex-col justify-center items-start gap-4 ml-[-25px]">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col gap-0 text-white/65 ml-16">
                    Contest Rating{" "}
                    <span className="text-3xl font-semibold text-white">
                      {userData.pastRatings[userData.pastRatings.length - 1]}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0 text-white/65 ml-16">
                    Attended{" "}
                    <span className="text-3xl font-semibold text-white">
                      {userData.pastRatings.length}
                    </span>
                  </div>
                </div>
                <RatingGraph ratings={userData.pastRatings} />
              </div>
            </div>
          </div>
          <div className="mt-4 bg-[#ffffff05] rounded-lg p-6 w-full border-1 border-[#ffffff10] flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Problems Solved</h2>
            <div className="flex items-center gap-4">
              <div className="text-white text-lg px-3 py-2 bg-white/5 rounded-lg border-1 border-[#ffffff15] flex justify-between gap-5">
                {" "}
                <span className="text-green-500 font-semibold">Easy</span>{" "}
                <span className="font-light text-2xl text-white/8">|</span>{" "}
                {userData.problemCount.easyCount}/
                {userData.problemCount.totalEasyCount}
              </div>
              <div className="text-white text-lg px-3 py-2 bg-white/5 rounded-lg border-1 border-[#ffffff15] flex justify-between gap-5">
                {" "}
                <span className="text-yellow-500 font-semibold">
                  Medium
                </span>{" "}
                <span className="font-light text-2xl text-white/8">|</span>
                {userData.problemCount.mediumCount}/
                {userData.problemCount.totalMediumCount}
              </div>
              <div className="text-white text-lg px-3 py-2 bg-white/5 rounded-lg border-1 border-[#ffffff15] flex justify-between gap-5">
                {" "}
                <span className="text-red-500 font-semibold">Hard</span>{" "}
                <span className="font-light text-2xl text-white/8">|</span>
                {userData.problemCount.hardCount}/
                {userData.problemCount.totalHardCount}
              </div>
              <div className="text-white text-lg px-3 py-2 bg-white/5 rounded-lg border-1 border-[#ffffff15] flex justify-between gap-5">
                {" "}
                <span className="text-white/65 font-semibold">
                  Total Submissions
                </span>{" "}
                <span className="font-light text-2xl text-white/8">|</span>
                {userData.submissions.length}
              </div>
            </div>
          </div>
          <div className="mt-4 bg-[#ffffff05] rounded-lg py-6 px-2 w-full border-1 border-[#ffffff10] flex flex-col justify-start gap-2">
            <h2 className="text-2xl font-semibold px-4 mb-2">
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
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">
                      {submission.problem.title}
                    </span>
                    <span
                      className={`text-${
                        submission.verdict === "Accepted"
                          ? "green-500 bg-green-500/10"
                          : "red-500 bg-red-500/10"
                      } rounded-full px-2 py-1 text-sm`}
                    >
                      {submission.verdict}
                    </span>
                  </div>
                  <p className="text-sm">
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
