"use client";

import { useEffect, useRef, useState } from "react";
import { IFlash, IKeyboard } from "./icons";

type Detector = { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> };
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

/**
 * Camera barcode scanner. Uses the native BarcodeDetector (Chrome/Android, recent Safari) and falls back to ZXing.
 * Calls onCode once per distinct code read twice in a row (avoids misreads).
 */
export default function Scanner({ onCode, paused }: { onCode: (code: string) => void; paused?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "live" | "denied" | "nocam">("starting");
  const [torch, setTorch] = useState<boolean | null>(null);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");
  const track = useRef<MediaStreamTrack | null>(null);
  const cb = useRef(onCode);
  cb.current = onCode;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    let stop = false;
    let stream: MediaStream | null = null;
    let zxingControls: { stop(): void } | null = null;
    let last = "";
    let lastHit = 0;

    const hit = (raw: string) => {
      const c = raw.replace(/\D/g, "");
      if (pausedRef.current || c.length < 8) return;
      const now = Date.now();
      if (c === last && now - lastHit < 1500) {
        last = "";
        if ("vibrate" in navigator) navigator.vibrate?.(40);
        cb.current(c);
        return;
      }
      last = c;
      lastHit = now;
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("nocam");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch (e) {
        setState((e as Error).name === "NotAllowedError" ? "denied" : "nocam");
        return;
      }
      if (stop) return stream.getTracks().forEach((t) => t.stop());
      const v = video.current!;
      v.srcObject = stream;
      await v.play().catch(() => {});
      track.current = stream.getVideoTracks()[0] ?? null;
      const caps = track.current?.getCapabilities?.() as { torch?: boolean } | undefined;
      if (caps?.torch) setTorch(false);
      setState("live");

      const BD = (globalThis as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
      let native: Detector | null = null;
      if (BD) {
        try {
          const supported = await BD.getSupportedFormats();
          const f = FORMATS.filter((x) => supported.includes(x));
          if (f.length) native = new BD({ formats: f });
        } catch {
          native = null;
        }
      }
      if (native) {
        const loop = async () => {
          if (stop) return;
          if (v.readyState >= 2) {
            try {
              const r = await native!.detect(v);
              if (r[0]) hit(r[0].rawValue);
            } catch {
              /* frame not ready */
            }
          }
          setTimeout(loop, 120);
        };
        loop();
      } else {
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        if (stop) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100 });
        zxingControls = await reader.decodeFromVideoElement(v, (res) => {
          if (res) hit(res.getText());
        });
        if (stop) zxingControls.stop();
      }
    })();

    return () => {
      stop = true;
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleTorch = async () => {
    if (!track.current || torch === null) return;
    const next = !torch;
    try {
      await track.current.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorch(next);
    } catch {
      setTorch(null);
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\D/g, "");
    if (c.length >= 8) onCode(c);
  };

  return (
    <div className="stack">
      <div className="scanner">
        <video ref={video} playsInline muted aria-label="Cámara" />
        {state === "live" && (
          <div className="scan-frame">
            <div className="scan-line" />
          </div>
        )}
        {state === "starting" && <div className="scan-msg"><div className="spin" /></div>}
        {(state === "denied" || state === "nocam") && (
          <div className="scan-msg">
            <div>{state === "denied" ? "Permite el acceso a la cámara en los ajustes del navegador." : "No hay cámara disponible."}</div>
            <button className="btn sm" onClick={() => setManual(true)}>Escribir código</button>
          </div>
        )}
        {state === "live" && (
          <div className="scan-tools">
            {torch !== null && (
              <button className="icon-btn" aria-pressed={torch} onClick={toggleTorch} aria-label="Linterna">
                <IFlash />
              </button>
            )}
            <button className="icon-btn" aria-pressed={manual} onClick={() => setManual((m) => !m)} aria-label="Escribir código">
              <IKeyboard />
            </button>
          </div>
        )}
      </div>
      {manual && (
        <form onSubmit={submitManual} className="amount">
          <input className="input num" inputMode="numeric" autoFocus placeholder="Código de barras" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button className="btn primary" disabled={code.length < 8}>Buscar</button>
        </form>
      )}
    </div>
  );
}
