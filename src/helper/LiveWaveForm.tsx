import { useRef, useEffect } from "react";

export default function LiveWaveform({ mediaStream }: { mediaStream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!mediaStream) return;

    if (!(mediaStream instanceof MediaStream)) {
      console.error("Invalid mediaStream:", mediaStream);
      return;
    }

    const audioCtx = new AudioContext();
    
    // Resume AudioContext if suspended (Chrome requires user interaction)
    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => console.log("AudioContext resumed"));
    }

    const source = audioCtx.createMediaStreamSource(mediaStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#4F46E5";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      let allZero = true; // debug: check if audio is silent
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (v !== 1) allZero = false;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      if (allZero) {
        // Microphone might not be sending audio
        console.warn("Audio input is silent, waveform will be flat");
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      audioCtx.close().catch(() => {});
    };
  }, [mediaStream]);

  return <canvas ref={canvasRef} width={500} height={120} className="rounded-lg" />;
}
