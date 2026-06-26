import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: "rgba(10, 10, 11, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#FFFFFF",
          backdropFilter: "blur(10px)",
        },
      }}
    />
  );
}
