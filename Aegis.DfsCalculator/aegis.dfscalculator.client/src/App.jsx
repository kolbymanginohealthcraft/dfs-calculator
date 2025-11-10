import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
    const [count, setCount] = useState(0);         // count state
    const [forecast, setForecast] = useState([]);  // forecast state

    useEffect(() => {
        // Call your .NET backend API
        fetch("api/weather")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch");
                return res.json();
            })
            .then((data) => setForecast(data))
            .catch((err) => console.error("API error:", err));
    }, []);

    return (
        <>
            <div>
                <a href="https://vite.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
            </div>
            <h1>Vite + React + .NET</h1>

            <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </button>
                <p>
                    Edit <code>src/App.jsx</code> and save to test HMR
                </p>
            </div>

            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>

            <button onClick={() => window.location.href = "/account/login"}>
                Login
            </button>

            <div style={{ marginTop: "2rem" }}>
                <h2>Weather Forecast</h2>
                {forecast.length === 0 ? (
                    <p>Loading forecast...</p>
                ) : (
                    <ul>
                        {forecast.map((f, i) => (
                            <li key={i}>
                                {f.date}: {f.temperatureC}°C ({f.temperatureF}°F) – {f.summary}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

export default App;
