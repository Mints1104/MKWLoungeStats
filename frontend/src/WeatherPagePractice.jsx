import { useState } from "react";


function WeatherPagePractice() {

    const [city, setCity] = useState("")
    const [result, setResult] = useState(null)
    const [error,setError] = useState("")



    const getWeather = async () => {


        
        try {
            setError("");
            setResult(null);

            if(!city.trim()) {
                setError("Please enter a city name.");
                return;
            }
        const response = await fetch(`/weather/${encodeURIComponent(city)}`);


        if(!response.ok) {
            throw new Error("Failed to fetch weather");
        }
        const data = await response.json();

        setResult(data);

        }
        catch (err) {
            setError(err.message || "Failed to fetch weather")
        }

    };





    return (
        <div>

        <input 
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Enter a city name"
        />
    
        <button onClick={getWeather}>Get Weather</button>

        {error && <p style={{color: "red"}}>{error}</p>}

        {result && 

        <div>

            <p>Weather: {result.description}</p>

            </div>
        
        
        }


        </div>
    )

}

export default WeatherPagePractice;