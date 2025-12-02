import { useState } from "react";


function PokemonPage() {
    const [name, setName] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const getPokemon = async() => {

        try {
            setResult(null);
            setError("");

            if(!name.trim()) {
                setError("Please enter a pokemon name")
                return

            }
            const response = await fetch(`/pokemon/${encodeURIComponent(name)}`);

            if (!response.ok) {
                throw new Error("Failed to fetch Pokemon");
                
            
            }
            const data = await response.json();
            setResult(data);
        }

        catch (error) {
            setError(error.message || "An error has occurred");
        }


    };

    return (

        <div>

            <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter a pokemon name"

            />
            <button onClick={getPokemon}>Get Pokemon Data</button>

            {error && <p style={{color:"red"}}>{error}</p>}

            {result &&
            (

                <div>

                    <p>Pokemon Name: {result.name}</p>
                    <p>Pokedex ID {result.id}</p>
                    <p>Pokemon Height: {result.height}</p>
                    <p>Pokemon Weight: {result.weight}</p>
                    

                    </div>
            )
            
            
            }


        </div>
    )



}


export default PokemonPage;