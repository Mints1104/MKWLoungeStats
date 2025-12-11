import { useState } from "react";

function PlayerInfo() {

    const[name,setName] = useState("");
    const [detailedInfo, setDetailedInfo] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

   

     const getPlayerInfo = async() => {

        try {
            setError("");
            setDetailedInfo(null);
          
           

            if (!name.trim()) {
                setError("Please enter a name");
                return;
            }
            setLoading(true);
            const response = await fetch(`/api/player/details/${encodeURIComponent(name)}?season=1`);

            if (!response.ok) {
        throw new Error("Failed to fetch player data");
            }
            const data = await response.json();
           
            setDetailedInfo(data);
            
                
                   




        }
        catch(err) {
            setError(err.message || "Failed to fetch player data");


        }
        finally {
            setLoading(false);
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

             {error && <p style={{color:"red"}}>{error}</p>}
             {loading && <p>Loading...</p>}

            {detailedInfo && (

                <div>
                    <h1>Stats for {detailedInfo.name}</h1>
                    <p>Player ID: {detailedInfo.playerId}</p>
                    <p>Overall Rank: {detailedInfo.overallRank}</p>
                    <p>Current MMR: {detailedInfo.mmr}</p>
                    <p>Highest MMR: {detailedInfo.maxMmr}</p>
                    <p>Average Score: {detailedInfo.averageScore != null ?
                    detailedInfo.averageScore.toFixed(2) : "N/A"}</p>
                    
                    
                    <p>Total Events Played: {detailedInfo.eventsPlayed}</p>
                    {
                        detailedInfo.winRate >= 0.5
                        ? <p style={{color:"green"}}>Win Rate: {(detailedInfo.winRate *100).toFixed(2) }%</p>
                        : <p style={{color:"red"}}>Win Rate: {(detailedInfo.winRate * 100).toFixed(2) }%</p>

                    }
                    <p>Last 10 Events:</p>
                    {
                    
                    detailedInfo?.mmrChanges?.slice(0,10).map((event,index) => (
                        
                        <div key={index}>Scored: {event.score} in a {event.numPlayers}p event
                        {event.mmrDelta > 0 ?
                        <p style={{color:"green"}}>Change: +{event.mmrDelta}</p>
                        :
                        <p style={{color:"red"}}>Change: {event.mmrDelta}</p>
                    }
                        <p>New MMR: {event.newMmr}</p>
                        <a href={`https://lounge.mkcentral.com/mkworld/TableDetails/${event.changeId}`}>View Table</a>
                        
                        </div>

                        
                        

                    

                    ))}


                    
                    
                    </div>


            )}


        
        </div>



    )
}

export default PlayerInfo;