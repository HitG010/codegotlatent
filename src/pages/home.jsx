import React, {useEffect} from 'react'
import { Link } from 'react-router-dom'
import { UserContext } from '../providers/userProvider'
import { useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { handleLogOut } from '../api/firebase'

const Home = () => {
  const user = useContext(UserContext);
  const [redirectUrl, setredirectUrl] = useState(null);

  useEffect(() => {
    if (!user) {
      setredirectUrl("/register");
    }
    else{
      console.log("user in home page: ", user);

    if(localStorage.getItem("uuid") !== null) {
      // if the user is not null and the uuid is not null, set the uuid in the user object
      user.uuid = localStorage.getItem("uuid");
      console.log("user uuid: ", user.uuid)
    }
    else {
      
    }
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
        <button onClick={handleLogOut}
        className='px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600'
        >Log Out</button>
    </div>
  )
}

export default Home;
