import { buttonVariants } from "@/components/ui/button";
import { Link as LinkIcon, FileDown } from "lucide-react";

type Material = {
  id: string;
  title: string | null;
  material_type: "file" | "link" | "video" | null;
  file_url: string | null;
  url: string | null;
};

function ensureDownloadUrl(url: string, filename: string) {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("download")) {
      u.searchParams.set("download", filename || "material");
    }
    return u.toString();
  } catch {
    return url;
  }
}

export default function MaterialRow({ m }: { m: Material }) {
  // ⚙️ Prioridad: respetar lo que dice la base
  const mt = m.material_type ?? (m.file_url ? "file" : m.url ? "link" : null);
  const isFile = mt === "file" && !!m.file_url;
  const isLink = mt === "link" && !!m.url;

  const rawHref = isFile ? (m.file_url as string) : isLink ? (m.url as string) : "";
  const href = isFile ? ensureDownloadUrl(rawHref, m.title || "material") : rawHref;

  const label  = isFile ? "Archivo" : isLink ? "Enlace" : "Sin tipo";
  const action = isFile ? "Descargar" : isLink ? "Abrir" : "N/A";

  // 🔎 Debug: verificá que haya <a href=...>
  console.log("🔍 MATERIAL ROW DEBUG:", { 
    id: m.id, 
    material_type: m.material_type,
    mt, 
    isFile, 
    isLink,
    href, 
    file: m.file_url, 
    url: m.url 
  });

  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-3">
      <div className="flex items-center gap-3">
        {isFile ? <FileDown className="h-4 w-4 opacity-60" /> : <LinkIcon className="h-4 w-4 opacity-60" />}
        <div>
          <div className="font-medium">{m.title || "Sin título"}</div>
          <div className="text-xs opacity-60">{label}</div>
        </div>
      </div>

      {href ? (
        // ⬇️ ANCLA REAL con estilo de botón (no <button>)
        <a
          data-qa="material-link"
          href={href}
          onClick={(e) => {
            e.stopPropagation();
            console.log("🚀 CLICK EN MATERIAL:", { href, action, isFile });
          }}
          className={buttonVariants({ size: "sm", variant: "secondary" })}
          {...(isFile ? { download: "" } : { target: "_blank", rel: "noopener noreferrer" })}
        >
          {action}
        </a>
      ) : (
        <span className="text-xs opacity-60">Sin enlace</span>
      )}
    </div>
  );
}
