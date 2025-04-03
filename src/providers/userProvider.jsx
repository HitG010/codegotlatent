import { firebaseApp } from "../api/firebase";
import { createContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export const UserContext = createContext({user: null})
export default (props) => {
    const auth = getAuth(firebaseApp);
    const [user, setuser] = useState(null);
    useEffect(() => {
        onAuthStateChanged(auth, async (user) => {
            const { displayName, email, photoURL, accessToken }  = user;
            setuser({
                displayName,
                email,
                photoURL,
                uuid: null,
                accessToken,
                username: null
            })
        })
    },[]);

  return (
    <UserContext.Provider value={user}>{props.children}</UserContext.Provider>
  )
}