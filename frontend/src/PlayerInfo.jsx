import { useState } from "react";

function PlayerInfo() {

    const[name,setName] = useState("");
    const [result,setResult] = useState(null);
    const [detailedInfo, setDetailedInfo] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const getPlayerInfo = async() => {

        try {
            setError("");
            setResult(null);
            setDetailedInfo(null);
            setLoading(true);

            if (!name.trim()) {
                setError("Please enter a name");
                return;
            }
            const response = await fetch(`/api/player/leaderboard/${encodeURIComponent(name)}`);

            if (!response.ok) {
        throw new Error("Failed to fetch player data");
            }
            const data = await response.json();
            setLoading(false);
            setResult(data);
           
                   




        }
        catch(err) {
            setError(err.message || "Failed to fetch player data");


        }

        

    };

     const getEvents = async() => {

        try {
            setError("");
            setDetailedInfo(null);
            setResult(null);
            setLoading(true);

            if (!name.trim()) {
                setError("Please enter a name");
                return;
            }
            const response = await fetch(`/api/player/details/${encodeURIComponent(name)}?season=1`);

            if (!response.ok) {
        throw new Error("Failed to fetch events");
            }
            const data = await response.json();
            setLoading(false);
            setDetailedInfo(data);
            
                
                   




        }
        catch(err) {
            setError(err.message || "Failed to fetch player events");


        }

        

    };




    return (

         <div>

            <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a player name"
            />
            
         
            <button onClick={getPlayerInfo}>Get Player Info</button>
            <button onClick={getEvents}>Get Events</button>

             {error && <p style={{color:"red"}}>{error}</p>}
             {loading && <p>Loading...</p>}

            {detailedInfo && (

                <div>

                    <p>Overall Rank: {detailedInfo.overallRank}</p>
                    <p>Total Events Played: {detailedInfo.eventsPlayed}</p>
                    <p>Last 10 Event Scores:</p>
                    {
                    
                    detailedInfo?.mmrChanges?.slice(0,10).map(event => (
                        <div key={event}>Score: {event.score}</div>

                    

                    ))}


                    
                    
                    </div>


            )}


           
            {result && (
                <div>
                    
                   <p>ID: {result.id}</p>
                   <p>Current MMR: {result.mmr}</p>
                   <p>Highest MMR: {result.maxMmr}</p>
                   
                   
                    </div>
            )}
        </div>



    )
}

export default PlayerInfo;