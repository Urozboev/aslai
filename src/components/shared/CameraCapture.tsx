import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, RefreshCw, Check, Loader2, AlertTriangle } from "lucide-react";
import type { PhotoRequirement } from "@/lib/photoRequirements";
import { verifyPhoto, type PhotoVerification } from "@/lib/verifyPhoto";
import { uploadBusinessPhoto } from "@/lib/uploadPhoto";

export type VerifiedPhoto = {
  url: string;
  conditionScore: number;
  conditionNote: string;
};

type Props = {
  requirement: PhotoRequirement;
  onClose: () => void;
  onVerified: (data: VerifiedPhoto) => void;
};

type Phase = "camera" | "checking" | "uploading" | "result";

export default function CameraCapture({ requirement, onClose, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PhotoVerification | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError(
        "Kameraga ruxsat berilmadi yoki kamera topilmadi. Brauzer sozlamalaridan kameraga ruxsat bering (sayt HTTPS bo'lishi kerak).",
      );
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1] ?? "";
    setPreview(dataUrl);
    setPhase("checking");
    setResult(null);

    const verification = await verifyPhoto(base64, "image/jpeg", requirement.label, requirement.mustContain);
    setResult(verification);

    if (verification.match) {
      try {
        setPhase("uploading");
        const url = await uploadBusinessPhoto(base64, "image/jpeg");
        stopStream();
        onVerified({
          url,
          conditionScore: verification.conditionScore,
          conditionNote: verification.conditionNote,
        });
        return;
      } catch (err) {
        setResult({
          ...verification,
          match: false,
          feedback: err instanceof Error ? err.message : "Rasmni saqlab bo'lmadi.",
        });
      }
    }
    setPhase("result");
  };

  const retake = () => {
    setPreview(null);
    setResult(null);
    setPhase("camera");
  };

  const close = () => {
    stopStream();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0A0A0B] border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-semibold text-white">{requirement.label}</h3>
            <p className="text-[11px] text-[#8A8F98]">{requirement.hint}</p>
          </div>
          <button onClick={close} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10">
            <X size={18} className="text-[#8A8F98]" />
          </button>
        </div>

        {/* Kerakli obyektlar */}
        <div className="px-4 pt-3 flex flex-wrap gap-1.5">
          {requirement.mustContain.map((m, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[#0EA5A4]/10 text-[#0EA5A4] border border-[#0EA5A4]/20">
              {m}
            </span>
          ))}
        </div>

        {/* View */}
        <div className="p-4">
          <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3">
                <AlertTriangle size={28} className="text-amber-400" />
                <p className="text-sm text-[#8A8F98]">{error}</p>
                <button onClick={startCamera} className="text-sm text-[#0EA5A4] hover:underline">
                  Qayta urinish
                </button>
              </div>
            ) : (
              <>
                {/* Jonli kamera */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${preview ? "hidden" : ""}`}
                />
                {/* Olingan kadr */}
                {preview && <img src={preview} alt="capture" className="absolute inset-0 w-full h-full object-cover" />}

                {(phase === "checking" || phase === "uploading") && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={28} className="text-[#0EA5A4] animate-spin" />
                    <p className="text-sm text-white">
                      {phase === "uploading" ? "Saqlanmoqda…" : "AI tekshirmoqda…"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Natija (rad etilgan) */}
          {phase === "result" && result && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-300 font-medium flex items-center gap-2">
                <AlertTriangle size={14} /> Rasm qabul qilinmadi
              </p>
              {result.feedback && <p className="text-xs text-white/80 mt-1">{result.feedback}</p>}
              {result.missing.length > 0 && (
                <p className="text-xs text-[#8A8F98] mt-1">Topilmadi: {result.missing.join(", ")}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-3">
          {phase === "camera" && !error && (
            <button
              onClick={capture}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0EA5A4] text-white font-medium hover:bg-[#0D9488] transition-colors"
            >
              <Camera size={18} /> Suratga olish
            </button>
          )}
          {phase === "result" && (
            <button
              onClick={retake}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={18} /> Qayta suratga olish
            </button>
          )}
          {(phase === "checking" || phase === "uploading") && (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 text-[#8A8F98] font-medium"
            >
              <Check size={18} /> Tekshirilmoqda…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
