Hola programador,

Quiero cambiar cómo se ven las imágenes adjuntas en los posts principales.

Instrucción precisa para implementar (puedes copiar/pegar):

Hola, quiero cambiar cómo se ven las imágenes adjuntas en los posts principales.

Actualmente se muestran como una lista de archivos con un icono pequeño. Quiero que se vean exactamente igual que las imágenes en las respuestas:

- Incrustadas y visibles: Que la imagen se muestre directamente en el cuerpo del post, no solo el nombre del archivo.
- Tamaño más grande: Que tengan un tamaño considerable, como en la captura de pantalla que envié.
- Grid para varias imágenes: Si un post tiene varias imágenes, deberían mostrarse en una galería o un grid.
- Clic para ampliar: Al hacer clic en una imagen, debería abrirse en un modal a pantalla completa, igual que funciona en las respuestas.

Básicamente, quiero que la lógica de renderizado de archivos de las respuestas se aplique también a los archivos del post principal.

Notas técnicas / referencias rápidas:
- Reusar el componente/estilos que ya renderizan las imágenes en las respuestas (buscar `ReplyComponent` y la porción que renderiza `reply.files`).
- Las imágenes en respuestas usan un layout con `img` dentro de un contenedor que abre `setSelectedImage(file.file_url)` para el modal. Reusar ese mismo handler/modal.
- Para múltiples imágenes, usar CSS grid (ej. `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2`) y límites de tamaño con `object-cover` y `max-h-48` o similar.
- Mantener `loading="lazy"` en las imágenes para mejorar rendimiento.
- Añadir `alt` con el nombre del archivo para accesibilidad.

Si necesitás que implemente yo mismo los cambios en `src/pages/Comunidad.tsx`, decímelo y lo hago: puedo mover la lógica de renderizado de `reply.files` a una función reutilizable y aplicarla a `post.files`.

Gracias.
