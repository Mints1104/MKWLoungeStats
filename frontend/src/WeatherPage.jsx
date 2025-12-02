import { useState } from "react";


function WeatherPage() {

    const [city, setCity] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const getWeather = async() => {
       try {
        setError("");
        setResult(null);

        if (!city.trim()) {
            setError("Please enter a city name.");
            return;
        }
        const response = await fetch(`/weather/${encodeURIComponent(city)}`)

        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            const msg = errData?.error || "Failed to fetch weather";
            throw new Error(msg);
        }

        const data = await response.json();
        setResult(data);

    } catch(err) {
        setError(err.message || "Something went wrong");
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

            {error && <p style={{color:"red"}}>{error}</p>}
            {result && (
                <div>
                    
                    <p>Temp: {result.temperature}</p> 
                    <p>Wind Speed: {result.wind_speed}</p>
                    <p>Condition: {result.description}</p>
                    </div>
            )}
        </div>
    )


}

export default WeatherPage