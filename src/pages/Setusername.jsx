import React, {useEffect, useState} from 'react'
import { useContext } from 'react'
import { UserContext } from '../providers/userProvider'
import { Navigate } from 'react-router-dom'

const Setusername = () => {
    const [username, setUsername] = useState('');
    const user = useContext(UserContext);
    const [redirectUrl, setRedirectUrl] = useState(false);
    console.log("user in setusername page: ", user);

    useEffect(() => {
        if (user) {
            if(user.username !== null) {
                setRedirectUrl('/home');
            }
        }
         else {
            // check if the user is already present in the database
            // if yes, then set the user in the context and redirect to home page
            async function checkUser() {
                const response = await fetch(`${import.meta.env.VITE_BASE_URL}/checkExistingUser`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: user.email,
                    })
                });
                const data = await response.json();
                console.log("user in setusername page: ", data);
                if(data.username !== null) {
                    user.username = data.username;
                    user.uuid = data.uuid;
                    setRedirectUrl('/home');
                }
            }
            checkUser();
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
