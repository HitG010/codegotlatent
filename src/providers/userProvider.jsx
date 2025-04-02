import { firebaseApp } from "../data/firebase";
import { createContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export const UserContext = createContext({user: null})
export default (props) => {
    const auth = getAuth(firebaseApp);
    const [user, setuser] = useState(null);
    useEffect(() => {
        onAuthStateChanged(auth, async (user) => {
            const { displayName, email }  = user;
            setuser({
                displayName,
                email
            })
        })
    },[]);

  return (
    <UserContext.Provider value={user}>{props.children}</UserContext.Provider>
  )
}