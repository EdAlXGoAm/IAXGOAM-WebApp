import React, { useState, useRef, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const whisperWordBaseURL = `${process.env.REACT_APP_API_URL}/api/whisperWord/request`;
const gpt4oBaseURL = `${process.env.REACT_APP_API_URL}/api/gpt4o/request`;

const AudioRecorder = () => {
    const [recording, setRecording] = useState(false);
    const [audioURLs, setAudioURLs] = useState([]);
    const [volume, setVolume] = useState(0);
    const [averageVolume, setAverageVolume] = useState(0);
    const [voiceActivity, setVoiceActivity] = useState('voiceActivityEnd');
    const [activated, setActivated] = useState(false);
    const [activationTimer, setActivationTimer] = useState(null);
    const activatedRef = useRef(activated);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const volumeSumRef = useRef(0);
    const volumeCountRef = useRef(0);
    const silenceTimerRef = useRef(null);
    const audioRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        activatedRef.current = activated;
    }, [activated]);

    useEffect(() => {
        if (recording) {
            const updateVolume = () => {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
                const avg = sum / dataArrayRef.current.length;
                setVolume(avg);
                volumeSumRef.current += avg;
                volumeCountRef.current += 1;

                if (avg > 25) {
                    if (voiceActivity === 'voiceActivityEnd') {
                        setVoiceActivity('voiceActivityStart');
                        startInterventionRecording();
                    }
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                } else {
                    if (voiceActivity === 'voiceActivityStart') {
                        if (!silenceTimerRef.current) {
                            silenceTimerRef.current = setTimeout(() => {
                                setVoiceActivity('voiceActivityEnd');
                                stopInterventionRecording();
                            }, 2000);
                        }
                    }
                }
            };

            const interval = setInterval(updateVolume, 100);
            return () => clearInterval(interval);
        }
    }, [recording, voiceActivity]);

    const startInterventionRecording = () => {
        mediaRecorderRef.current.start();
        audioChunksRef.current = [];
    };

    const stopInterventionRecording = async () => {
        mediaRecorderRef.current.stop();
    };

    const handleStartRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        source.connect(analyserRef.current);

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            const audioURL = URL.createObjectURL(audioBlob);
            setAudioURLs((prevURLs) => [...prevURLs, audioURL]);
            setAverageVolume(volumeSumRef.current / volumeCountRef.current);
            audioChunksRef.current = [];

            // Enviar audio al servidor
            const formData = new FormData();
            formData.append('file', audioBlob, 'intervention.wav');
            const url = activatedRef.current ? gpt4oBaseURL : whisperWordBaseURL;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                console.log('Server response:', result);
                console.log(result.transcript);

                if (url === whisperWordBaseURL) {
                    if (result.response === 'activation') {
                        activateRecording();
                    }
                } else {
                    if (result.transcript.toLowerCase().includes('bye') || result.transcript.toLowerCase().includes('adios')) {
                        resetActivation();
                    }
                }

                const audioData = atob(result.audio);
                const audioArray = new Uint8Array(audioData.length).map((_, i) => audioData.charCodeAt(i));
                const audioResponseBlob = new Blob([audioArray], { type: 'audio/mp3' });
                const audioResponseURL = URL.createObjectURL(audioResponseBlob);

                setAudioURLs((prevURLs) => [...prevURLs, audioResponseURL]);
                if (audioRef.current) {
                    audioRef.current.src = audioResponseURL;
                    audioRef.current.play();
                }
            } catch (error) {
                console.error('Error sending audio to server:', error);
            }
        };

        setRecording(true);
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setRecording(false);
    };

    const activateRecording = () => {
        setActivated(true);
        const timer = setTimeout(() => {
            resetActivation();
        }, 5 * 60 * 1000);
        setActivationTimer(timer);
    };

    const resetActivation = () => {
        setActivated(false);
        if (activationTimer) {
            clearTimeout(activationTimer);
            setActivationTimer(null);
        }
    };

    const getBackgroundColor = () => {
        if (voiceActivity === 'voiceActivityStart' && !activated) {
            return 'yellow';
        } else if (voiceActivity === 'voiceActivityStart' && activated) {
            return 'green';
        } else if (voiceActivity === 'voiceActivityEnd' && !activated) {
            return '#f6f6f6';
        } else if (voiceActivity === 'voiceActivityEnd' && activated) {
            return 'blue';
        }
        return 'white';
    };

    return (
        <div style={{ backgroundColor: getBackgroundColor(), padding: '20px' }}>
            <button onClick={recording ? handleStopRecording : handleStartRecording}>
                {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {audioURLs.map((url, index) => (
                <audio key={index} controls src={url} />
            ))}
            <div>Volume: {volume.toFixed(2)}</div>
            {!recording && averageVolume > 0 && <div>Average Volume: {averageVolume.toFixed(2)}</div>}
            <div>Voice Activity: {voiceActivity}</div>
            <div>Activated: {activated ? 'Yes' : 'No'}</div>
            <audio ref={audioRef} controls />
            <ToastContainer />
        </div>
    );
};

export default AudioRecorder;
