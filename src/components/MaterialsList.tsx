import MaterialRow from "./MaterialRow";

export function MaterialsList({ materials }) {
  console.log(
    "LIST",
    materials.map(m => ({ id: m.id, mt: m.material_type, url: m.url, file: m.file_url }))
  );
  return (
    <div className="space-y-2">
      {materials.map(m => <MaterialRow key={m.id} m={m} />)}
    </div>
  );
}
