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
  // agrega ?download= para forzar descarga en buckets públicos
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

export default function MaterialsSection({ materials }: { materials: Material[] }) {
  console.log("🔍 MATERIALS SECTION - materials:", materials);
  
  return (
    <div className="space-y-2">
      {/* TEST VISUAL DIRECTO */}
      <div className="p-4 bg-red-100 border border-red-400 rounded">
        <h4 className="font-bold text-red-800">🚨 TEST DIRECTO EN MATERIALS SECTION</h4>
        <p className="text-sm text-red-700">Si ves esto, MaterialsSection se está renderizando</p>
        <p className="text-sm text-red-700">Cantidad de materiales: {materials?.length || 0}</p>
        <a 
          href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf?download=dummy.pdf"
          className="inline-block mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          🔗 Test PDF (debería abrir)
        </a>
      </div>
      
      {materials?.map((m) => {
        console.log("🔍 MATERIAL:", m);
        
        // Si hay datos viejos sin material_type, deducimos por las URLs
        const mt = m.material_type ?? (m.file_url ? "file" : m.url ? "link" : "link");
        const isFile = mt === "file" && !!m.file_url;
        const isLink = mt === "link" && !!m.url;

        // href final
        const rawHref = isFile ? (m.file_url as string) : isLink ? (m.url as string) : "";
        const href = isFile ? ensureDownloadUrl(rawHref, m.title || "material") : rawHref;

        console.log("🔍 MATERIAL PROCESSED:", { mt, isFile, isLink, href });

        return (
          <div key={m.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
            <div className="flex items-center gap-3">
              {isFile ? <FileDown className="h-4 w-4 opacity-60" /> : <LinkIcon className="h-4 w-4 opacity-60" />}
              <div>
                <div className="font-medium">{m.title || "Sin título"}</div>
                <div className="text-xs opacity-60">{isFile ? "Archivo" : "Enlace"}</div>
              </div>
            </div>

            {href ? (
              // ⬇️ ANCLA REAL con estilo de botón. Esto abre sí o sí.
              <a
                href={href}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("🚀 CLICK EN MATERIAL:", { href, isFile });
                }}
                className={buttonVariants({ size: "sm", variant: "secondary" })}
                {...(isFile ? { download: "" } : { target: "_blank", rel: "noopener noreferrer" })}
              >
                {isFile ? "Descargar" : "Abrir"}
              </a>
            ) : (
              <span className="text-xs opacity-60">Sin enlace</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
