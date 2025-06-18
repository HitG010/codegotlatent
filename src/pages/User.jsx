import { getUserData } from "../api/api";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RatingGraph from "../components/RatingGraph";

function User() {
  const { userName } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userData) {
    return <div>User not found</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="bg-[#ffffff05] rounded-lg p-6 w-full border border-1 border-[#ffffff10] flex items-center justify-start gap-8">
        <div className="rounded-full w-24 h-24 bg-gray-200 flex items-center justify-center">
          {/* User avatar or image can go here */}
        </div>
        <div>
          <h1 className="text-3xl font-semibold">{userData.username}</h1>
          <p className="text-white/65">{userData.email}</p>
        </div>
        {/* Add more user details as needed */}
      </div>
      <div className="mt-2 bg-[#ffffff05] rounded-lg p-6 w-full border border-1 border-[#ffffff10] flex items-center justify-start gap-8">
        <h2 className="text-2xl font-semibold">Problems Solved</h2>
        <p className="text-white/65"> Easy: {userData.problemCount.easyCount}</p>
        <p className="text-white/65"> Medium: {userData.problemCount.mediumCount}</p>
        <p className="text-white/65"> Hard: {userData.problemCount.hardCount}</p>
      </div>
      <div className="mt-2 bg-[#ffffff05] rounded-lg p-6 w-full border border-1 border-[#ffffff10] flex flex-col items-center justify-start gap-8">
        <h2 className="text-2xl font-semibold">Contest Ratings</h2>
        <div className="w-full flex justify-center gap-4">
          <RatingGraph ratings={userData.pastRatings} />
          Current Rating: <span className="text-lg font-semibold">{userData.pastRatings[userData.pastRatings.length -1]}</span>
          </div>
      </div>
      <div className="mt-2 bg-[#ffffff05] rounded-lg py-6 px-2 w-full border border-1 border-[#ffffff10] flex flex-col justify-start gap-2">
        <h2 className="text-2xl font-semibold px-4">Submissions</h2>
        {userData.submissions.length > 0 ? (
            userData.submissions.map((submission, index) => (
              <Link key={index} className="text-white/65 hover:text-white hover:bg-[#ffffff03] px-4 py-1 rounded transition-all duration-300 border-b border-[#ffffff10]" to={`/submission/${submission.id}`} target="_blank">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">{submission.problem.title}</span>
                  <span className={`text-${submission.verdict === "Accepted" ? "green-500 bg-green-500/10" : "red-500 bg-red-500/10"} rounded-full px-2 py-1 text-sm`}>{submission.verdict}</span>
                </div>
                <p className="text-sm">Submitted at: {new Date(submission.createdAt).toLocaleString()}</p>
              </Link>
            ))
          ) : (
            <p className="text-white/65">No submissions found</p>
          )}
        </div>
    </div>
  );
}

export default User;
