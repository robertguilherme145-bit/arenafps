import { ImagePlus, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { uploadImage } from "../../services/api";
import { useToast } from "../../hooks/useToast";

export function ImageUploadField({ value, onChange, label = "Enviar imagem" }: { value?:string; onChange:(url:string)=>void; label?:string }) {
  const [busy, setBusy] = useState(false);
  const { error } = useToast();
  async function select(file?:File) {
    if (!file) return;
    setBusy(true);
    try { onChange((await uploadImage(file)).url); }
    catch (reason) { error("Falha no upload", reason instanceof Error ? reason.message : "Tente novamente."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    {value ? <img alt="Pre-visualizacao" className="h-28 w-full border border-arena-line object-cover" src={value} /> : null}
    <label className="flex h-10 cursor-pointer items-center justify-center gap-2 border border-arena-line bg-white/[.04] px-3 text-sm font-semibold hover:bg-white/[.07]">
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{busy ? "Enviando" : label}
      <input accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} type="file" onChange={(event)=>void select(event.target.files?.[0])} />
    </label>
  </div>;
}
