import React, {useState, useEffect} from 'react'
import { useParams } from 'react-router-dom'
import { getContestUsers, fetchContestStartTime } from '../api/api'

const contestRanking = () => {
    const { contestId } = useParams()
    console.log(contestId, "Contest ID in Contest Rating")
    // fetch the users in the contest using the contestId
    const [users, setUsers] = useState([])
    const [startTime, setStartTime] = useState(new Date().getTime())
    useEffect(() => {
        const fetchUsers = async () => {
            const response = await getContestUsers(contestId)
            console.log(response, "Contest Users")
            setUsers(response)
        }
        fetchUsers()
        const fetchStartTime = async () => {
            const response = await fetchContestStartTime(contestId)
            console.log(response, "Contest Start Time")
            setStartTime(response)
        }
        fetchStartTime()
    }, [contestId])

    console.log(typeof startTime, "Start Time")
    console.log(typeof users[0]?.finishTime, "Finish Time")

  return (
    <div>
      This is the contest rating page for the contest : {contestId}
      <div className='flex flex-col items-center justify-center w-full'>
        <h1 className='text-2xl font-bold text-[#f1f3f5]'>Contest Ranking</h1>
        <div className='flex flex-col items-center justify-center'>
          {users && users.map((user) => (
            <div key={user.userId} className='flex flex-row items-center justify-between w-full gap-16'>
              <h1 className='text-lg font-bold text-[#f1f3f5]'>{user.username}</h1>
              <h1 className='text-lg font-bold text-[#f1f3f5]'>{user.score}</h1>
              <h1 className='text-lg font-bold text-[#f1f3f5]'>{user.penalty}</h1>
              <h1 className='text-lg font-bold text-[#f1f3f5]'>
                {((new Date(user.finishTime) - new Date(startTime)) / (60 * 1000)).toFixed(2)} minutes
              </h1>
            </div>
          ))}
        </div>
        </div>
    </div>
  )
}

export default contestRanking
