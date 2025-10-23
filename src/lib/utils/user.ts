/**
 * Genera las iniciales de un nombre
 * @example getInitials('Juan Pérez') => 'JP'
 * @example getInitials('María') => 'MA'
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Obtiene el color de badge para un rol de usuario
 */
export function getRoleColor(role?: string): string {
  switch ((role || '').toLowerCase()) {
    case 'admin':
    case 'administrador':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'teacher':
    case 'formador':
    case 'profesor':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'voluntario':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'student':
    case 'estudiante':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

/**
 * Obtiene la etiqueta legible de un rol de usuario
 */
export function getRoleLabel(role?: string): string {
  switch ((role || '').toLowerCase()) {
    case 'admin':
    case 'administrador':
      return 'Administrador';
    case 'teacher':
    case 'formador':
    case 'profesor':
      return 'Formador';
    case 'voluntario':
      return 'Voluntario';
    case 'student':
    case 'estudiante':
    default:
      return 'Estudiante';
  }
}

/**
 * Detecta el navegador actual del usuario
 */
export function detectBrowser(): string {
  const ua = navigator.userAgent;

  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';

  return 'Navegador desconocido';
}

/**
 * Detecta el sistema operativo actual del usuario
 */
export function detectOS(): string {
  const ua = navigator.userAgent;

  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';

  return 'Sistema desconocido';
}
