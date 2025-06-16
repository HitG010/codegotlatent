import { getUserData } from "../api/api";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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
    <div className="user-profile">
      <h1>{userData.name}</h1>
      <p>Email: {userData.email}</p>
      <p>Joined: {new Date(userData.joined).toLocaleDateString()}</p>
      {/* Add more user details as needed */}
    </div>
  );
}

export default User;
