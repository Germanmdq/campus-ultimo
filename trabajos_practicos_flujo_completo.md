# 🎯 FLUJO COMPLETO DE TRABAJOS PRÁCTICOS

## 📋 **RESUMEN DEL SISTEMA**

El sistema de trabajos prácticos permite a los estudiantes enviar entregas y a los profesores revisarlas y aprobarlas.

## 🔄 **FLUJO PASO A PASO**

### **1. CONFIGURACIÓN INICIAL**
```typescript
// En la tabla lessons, marcar que tiene trabajo práctico
UPDATE lessons SET has_assignment = true WHERE id = 'lesson-id';
```

### **2. ESTUDIANTE VE LA LECCIÓN**
```typescript
// En LessonDetail.tsx
{lesson.has_assignment && (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">Tiene entregable</span>
    </div>
    {profile?.role === 'student' && (
      <div className="space-y-2 p-3 border rounded-md">
        <Button
          className="w-full"
          onClick={() => window.open('https://www.dropbox.com/request/LlaRtF8KefIoXHjdg0Uo', '_blank')}
        >
          Enviar trabajo práctico (Dropbox)
        </Button>
      </div>
    )}
  </div>
)}
```

### **3. ESTUDIANTE ENVÍA TRABAJO**
```typescript
// Función handleSubmitAssignment en LessonDetail.tsx
const handleSubmitAssignment = async () => {
  // 1. Validar enlace de Dropbox
  if (!dropboxLink.trim()) {
    toast({ title: 'Falta el enlace', description: 'Pegá el enlace de Dropbox del archivo.' });
    return;
  }

  // 2. Normalizar enlace de Dropbox
  const fileUrl = normalizeDropboxLink(dropboxLink);

  // 3. Crear payload
  const payload = {
    user_id: profile.id,
    lesson_id: lesson.id,
    text_answer: textAnswer.trim() || null,
    file_url: fileUrl,
    status: 'submitted' as const,
  };

  // 4. Guardar en base de datos
  const { error } = await supabase
    .from('assignments')
    .upsert(payload, { onConflict: 'user_id,lesson_id' });

  // 5. Mostrar confirmación
  toast({ title: 'Enviado', description: 'Tu trabajo fue enviado para revisión.' });
};
```

### **4. PROFESOR VE TRABAJOS PENDIENTES**
```typescript
// En Profesor.tsx - fetchData()
const fetchData = async () => {
  // 1. Obtener todos los trabajos
  const { data: assignmentsData } = await supabase
    .from('assignments')
    .select(`
      *,
      lesson:lessons(title, course:courses(title))
    `)
    .order('created_at', { ascending: false });

  // 2. Obtener perfiles de usuarios
  const assignmentsWithProfiles = await Promise.all(
    assignmentsData.map(async (assignment) => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', assignment.user_id)
        .single();

      return {
        ...assignment,
        user_profile: { full_name: profileData?.full_name || 'Usuario desconocido' }
      };
    })
  );

  setAssignments(assignmentsWithProfiles);
};
```

### **5. PROFESOR REVISA Y APRUEBA/RECHAZA**
```typescript
// En Profesor.tsx - handleApproveAssignment()
const handleApproveAssignment = async (assignmentId: string, action: 'approved' | 'rejected') => {
  // 1. Validar feedback si es rechazo
  if (action === 'rejected' && !feedback.trim()) {
    toast({ title: "Error", description: "El feedback es requerido para rechazar una entrega" });
    return;
  }

  // 2. Actualizar assignment
  const { error } = await supabase
    .from('assignments')
    .update({
      status: action,
      grade: gradeValue,
      feedback: feedback.trim(),
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', assignmentId);

  // 3. Si se aprobó, enviar email
  if (action === 'approved') {
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', assignment.user_id)
      .single();
    
    if (studentProfile?.email) {
      await sendModuleCompletedEmail({
        to: studentProfile.email,
        modulo: assignment.lesson.title,
        ctaUrl: `${window.location.origin}/curso/${assignment.lesson_id}`,
      });
    }
  }

  // 4. Mostrar confirmación
  toast({ title: "Éxito", description: `Entrega ${action === 'approved' ? 'aprobada' : 'rechazada'}` });
};
```

### **6. TRIGGER DE BASE DE DATOS**
```sql
-- Trigger que se ejecuta automáticamente al aprobar
CREATE OR REPLACE FUNCTION handle_assignment_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se aprueba, marcar lección como completada
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at)
    VALUES (NEW.user_id, NEW.lesson_id, true, NOW())
    ON CONFLICT (user_id, lesson_id)
    DO UPDATE SET 
      completed = true,
      completed_at = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 🎯 **COMPONENTES PRINCIPALES**

### **ESTUDIANTE:**
- ✅ Ve lecciones con `has_assignment: true`
- ✅ Hace click en "Enviar trabajo práctico"
- ✅ Sube archivo a Dropbox
- ✅ Pega enlace en el formulario
- ✅ Envía trabajo (se guarda en `assignments`)
- ✅ Recibe notificación cuando se aprueba

### **PROFESOR:**
- ✅ Ve lista de trabajos pendientes en `/profesor`
- ✅ Revisa archivo y comentarios del estudiante
- ✅ Aprueba o rechaza con feedback
- ✅ Sistema envía email automáticamente al estudiante
- ✅ Trigger marca lección como completada si se aprueba

### **SISTEMA:**
- ✅ Tabla `assignments` almacena todos los trabajos
- ✅ RLS (Row Level Security) protege los datos
- ✅ Triggers automáticos para completar lecciones
- ✅ Sistema de emails para notificaciones
- ✅ Upsert permite re-envío de trabajos

## 🔧 **CONFIGURACIÓN NECESARIA**

1. **Base de datos:** Ejecutar `trabajos_practicos_database.sql`
2. **Frontend:** Usar código de `trabajos_practicos_estudiante.tsx` y `trabajos_practicos_profesor.tsx`
3. **Lecciones:** Marcar `has_assignment = true` en las lecciones que requieren trabajo
4. **Dropbox:** Configurar carpeta de recepción en Dropbox
5. **Emails:** Configurar función `sendModuleCompletedEmail`

## 📊 **ESTADÍSTICAS DISPONIBLES**

```sql
-- Obtener estadísticas de trabajos
SELECT * FROM get_assignment_stats();

-- Ver trabajos con detalles completos
SELECT * FROM assignments_with_details;
```

## 🚨 **CONSIDERACIONES IMPORTANTES**

- **Seguridad:** RLS protege que estudiantes solo vean sus trabajos
- **Re-envío:** Upsert permite que estudiantes re-envíen trabajos
- **Notificaciones:** Emails automáticos al aprobar/rechazar
- **Progreso:** Trigger automático marca lección como completada
- **Validación:** Feedback obligatorio para rechazos
