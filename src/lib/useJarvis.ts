import { useState, useRef, useEffect, useCallback } from 'react';
import { pcmToBase64, base64ToFloat32 } from './audio';

interface UseJarvisOptions {
  onVoiceCommand?: (transcript: string) => void;
  onModelTranscript?: (transcript: string) => void;
}

export function useJarvis(options?: UseJarvisOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const onVoiceCommandRef = useRef(options?.onVoiceCommand);
  const onModelTranscriptRef = useRef(options?.onModelTranscript);

  useEffect(() => {
    onVoiceCommandRef.current = options?.onVoiceCommand;
    onModelTranscriptRef.current = options?.onModelTranscript;
  }, [options?.onVoiceCommand, options?.onModelTranscript]);

  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);

  // Local Web Speech synthesis fallback if Gemini Live WebSocket is unreachable or key isn't set
  const speakFallback = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }, []);

  const interruptPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {}
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
  }, []);

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {}
    }

    const float32Array = base64ToFloat32(base64Audio);
    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    if (nextStartTimeRef.current < ctx.currentTime) {
      nextStartTimeRef.current = ctx.currentTime + 0.04;
    }

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;

    activeSourcesRef.current.push(source);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  }, []);

  const stopAll = useCallback(() => {
    setIsConnected(false);
    setIsListening(false);
    setVolume(0);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputCtxRef.current) {
      try {
        inputCtxRef.current.close();
      } catch {}
      inputCtxRef.current = null;
    }

    if (outputCtxRef.current) {
      try {
        outputCtxRef.current.close();
      } catch {}
      outputCtxRef.current = null;
    }

    interruptPlayback();
  }, [interruptPlayback]);

  // Starts browser SpeechRecognition alongside mic capture so spoken commands ("boost ram", "clean storage") always trigger actions and work even if Live API fails
  const startLocalSpeechRecognition = useCallback((useTtsReply: boolean) => {
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!SpeechRecognitionClass) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const lastIdx = event.results.length - 1;
        const transcript = event.results[lastIdx]?.[0]?.transcript?.trim();
        if (transcript && onVoiceCommandRef.current) {
          onVoiceCommandRef.current(transcript);
          if (useTtsReply) {
            speakFallback(`Executing command: ${transcript}`);
          }
        }
      };

      recognition.onerror = () => {};
      recognition.start();
      recognitionRef.current = recognition;
    } catch {}
  }, [speakFallback]);

  const connect = useCallback(async () => {
    if (isConnected || isListening) return;

    try {
      setError(null);
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Audio API not supported in this browser.');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is blocked. Please allow microphone permission in your browser.');
      }

      inputCtxRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputCtxRef.current = new AudioContextClass({ sampleRate: 24000 });

      // Explicitly resume both AudioContexts on user click so Chrome/Edge does not mute playback
      if (inputCtxRef.current.state === 'suspended') {
        await inputCtxRef.current.resume();
      }
      if (outputCtxRef.current.state === 'suspended') {
        await outputCtxRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const source = inputCtxRef.current.createMediaStreamSource(stream);
      const processor = inputCtxRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(inputCtxRef.current.destination);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsListening(true);
      };

      ws.onclose = () => {
        // Keep local voice recognition active if error occurred, or clean up
        if (!recognitionRef.current) {
          stopAll();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            // Switch smoothly to local browser speech recognition + TTS fallback while showing helpful notice
            setError(msg.error);
            if (!recognitionRef.current) {
              startLocalSpeechRecognition(true);
            }
            setIsConnected(true);
            setIsListening(true);
            return;
          }
          if (msg.audio) {
            playAudioChunk(msg.audio);
          }
          if (msg.inputTranscript && onVoiceCommandRef.current) {
            onVoiceCommandRef.current(msg.inputTranscript);
          }
          if (msg.outputTranscript && onModelTranscriptRef.current) {
            onModelTranscriptRef.current(msg.outputTranscript);
          }
          if (msg.interrupted) {
            interruptPlayback();
          }
        } catch {}
      };

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        setVolume(rms);

        if (ws.readyState === WebSocket.OPEN) {
          const base64 = pcmToBase64(inputData);
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };
    } catch (err: any) {
      console.error('Failed to connect to J.A.R.V.I.S.', err);
      setError(err.message || 'Microphone permission denied.');
      stopAll();
    }
  }, [isConnected, isListening, playAudioChunk, interruptPlayback, stopAll, startLocalSpeechRecognition]);

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  const toggleConnection = () => {
    if (isConnected) {
      stopAll();
    } else {
      connect();
    }
  };

  return {
    isConnected,
    isListening,
    volume,
    error,
    toggleConnection,
    speakFallback,
  };
}
