import { useState } from "react";
import AudioRecorder from "./components/AudioRecorder";
import AudioMonitorRealTime from "./components/AudioMonitorRealTime";

function Home() {
    return (
        <div className="container container-fluid">
        <div className="row">
            <div className="col">
            <h1>Tareas, Alarmas y Eventos!</h1>
            </div>
        </div>
    
        <div className="row">
            <div className="col">
                <AudioRecorder />
            </div>
        </div>

        <div className="row">
            <div className="col">
                <AudioMonitorRealTime />
            </div>
        </div>
        </div>
    );
}

export default Home;