import React, { useState, useRef, useEffect } from 'react';

const AudioRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [audioURLs, setAudioURLs] = useState([]);
  const [volume, setVolume] = useState(0);
  const [averageVolume, setAverageVolume] = useState(0);
  const [voiceActivity, setVoiceActivity] = useState('voiceActivityEnd');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const volumeSumRef = useRef(0);
  const volumeCountRef = useRef(0);
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    if (recording) {
      const updateVolume = () => {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
        const avg = sum / dataArrayRef.current.length;
        setVolume(avg);
        volumeSumRef.current += avg;
        volumeCountRef.current += 1;

        if (avg > 20) {
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
              }, 1000);
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

  const stopInterventionRecording = () => {
    mediaRecorderRef.current.stop();
  };

  const handleStartRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const audioURL = URL.createObjectURL(audioBlob);
      setAudioURLs((prevURLs) => [...prevURLs, audioURL]);
      setAverageVolume(volumeSumRef.current / volumeCountRef.current);
      audioChunksRef.current = [];
    };

    setRecording(true);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  return (
    <div>
      <button onClick={recording ? handleStopRecording : handleStartRecording}>
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {audioURLs.map((url, index) => (
        <audio key={index} controls src={url} />
      ))}
      <div>Volume: {volume.toFixed(2)}</div>
      {!recording && averageVolume > 0 && <div>Average Volume: {averageVolume.toFixed(2)}</div>}
      <div>Voice Activity: {voiceActivity}</div>
    </div>
  );
};

export default AudioRecorder;