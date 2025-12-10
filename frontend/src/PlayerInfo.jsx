import { useState } from "react";

function PlayerInfo() {

    const[name,setName] = useState("");
    const [result,setResult] = useState(null);
    const [detailedInfo, setDetailedInfo] = useState(null);
    const [error, setError] = useState("");
    

    const getPlayerInfo = async() => {

        try {
            setError("");
            setResult(null);

            if (!name.trim()) {
                setError("Please enter a name");
                return;
            }
            const response = await fetch(`/api/player/leaderboard/${encodeURIComponent(name)}`);

            if (!response.ok) {
        throw new Error("Failed to fetch player data");
            }
            const data = await response.json();
            setResult(data);
            setId(data.id);
                   




        }
        catch(error) {
            setError(error.message || "Failed to fetch player data");


        }

        

    };

     const getEvents = async() => {

        try {
            setError("");
            setDetailedInfo(null);

            if (!name) {
                setError("Please enter a name");
                return;
            }
            const response = await fetch(`/api/player/details/${encodeURIComponent(name)}?season=1`);

            if (!response.ok) {
        throw new Error("Failed to fetch events");
            }
            const data = await response.json();
            setDetailedInfo(data);
            
                
                   




        }
        catch(error) {
            setError(error.message || "Failed to fetch player events");


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

            {detailedInfo && (

                <div>

                    <p>Overall Rank: {detailedInfo.overallRank}</p>

                    </div>


            )}


            {error && <p style={{color:"red"}}>{error}</p>}
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