import React, {useEffect} from 'react'
import { Link } from 'react-router-dom'
import { UserContext } from '../providers/userProvider'
import { useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { handleLogOut } from '../api/firebase'
import axios from 'axios'

const Home = () => {
  const user = useContext(UserContext);
  const [redirectUrl, setredirectUrl] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!user) {
      setredirectUrl("/register");
    }
    else{
      console.log("user in home page: ", user);
      // upload the user to databse and get the uuid
      async function uploadUser() {
        try {
          // Check if user already exists
          const existingUser = await axios.post(
            `${import.meta.env.VITE_BASE_URL}/checkExistingUser`, {
              email: user.email
            }
          );

          if (existingUser) {
            console.log("User already exists:", existingUser.data);
            setUsername(existingUser.data.username);
            user.username = existingUser.data.username;
            user.uuid = existingUser.data.id;
            localStorage.setItem("user", JSON.stringify(user));
            console.log(localStorage.getItem("user"));
            return;
          }

        const uuidUser = await axios.post(`${import.meta.env.VITE_BASE_URL}/auth`, {
          email: user.email,
          displayName: user.displayName
        });
        console.log("uuid: ", uuidUser.data);
        user.username = uuidUser.data.username;
        user.uuid = uuidUser.data.id;
        setUsername(uuidUser.data.username);
        localStorage.setItem("user", JSON.stringify(user));
        console.log(localStorage.getItem("user"));
      }
      catch (error) {
        console.log("Error uploading user:", error);
      }
    }
      uploadUser();
  }
  }, [user]);
  if (redirectUrl) {
    return <Navigate to={redirectUrl} />;
  }
  return (
    <div>
      Welcome to Code got Latent!
      <Link to="/problemSet" style={{ textDecoration: 'none', color: 'blue' }}>
        <h2>Problem Set</h2>
        </Link>
      <Link to="/contests" style={{ textDecoration: 'none', color: 'blue' }}>
        <h2>Contests</h2>
        </Link>
        {username !== null && <p>Hello {username}</p>}
        <button onClick={handleLogOut}
        className='px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600'
        >Log Out</button>
    </div>
  )
}

export default Home;
