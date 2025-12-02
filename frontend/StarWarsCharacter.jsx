import { use, useState } from "react";


function StarWarsCharacter() {
    const [id, setId] = useState("")
    const [result, setResult] = useState(null)
    const [error, setError] = useState("")

    const getCharacter = async () => {

        try {
            setResult(null)
            setError("")

            if (!id.trim()) {
                setError("Please enter an ID");
                return
            }

            const response = await fetch(`/people/${encodeURIComponent(id)}`);

            if (!response.ok) {
                throw new Error("Failed to fetch character");
            }
            const data = await response.json();
            setResult(data);


        }

        catch (error) {
            setError(error.message || "Failed to fetch character");


        }
    }

    return (
        <>

        <input
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder="Enter an ID"
        />

        <button onClick={getCharacter}>Get Character</button>

        {error && <p style={{color:"red"}}>{error}</p>}

        {result && (
            <div>
            <p>Name: {result.name}</p>
            <p>Height: {result.height}cm</p>
            <p>Birth Year: {result.birth_year}</p>

            </div>

            
        )}
        
        
        
        </>
    )



}

export default StarWarsCharacter;