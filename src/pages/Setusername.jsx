import React, {useEffect, useState} from 'react'
import { useContext } from 'react'
import { UserContext } from '../providers/userProvider'
import { Navigate } from 'react-router-dom'

const Setusername = () => {
    const [username, setUsername] = useState('');
    const user = useContext(UserContext);
    const [redirectUrl, setRedirectUrl] = useState(false);

    useEffect(() => {
        if (user) {
            if(user.username !== null) {
                setRedirectUrl('/home');
            }
        }
    }
    , [user])
    if (redirectUrl) {
        return <Navigate to={redirectUrl} />;
    }
  return (
    <div>
      What would you like to be called?
      <input type="text" placeholder='Enter your username' className='border-2 border-gray-300 rounded-md px-2 py-1' value={username} onChange={(event)=>{
        event.preventDefault();
        setUsername(event.target.value)
      }}/>
        <button className='px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600'
        onClick={() => {
                if(username === '') {
                    alert("Please enter a username")
                }
                else {
                    user.username = username;
                    console.log("user in setusername page: ", user);
                    setRedirectUrl("/home")
                }
            }
        }>Set Username & Continue to homepage</button>
    </div>
  )
}

export default Setusername
