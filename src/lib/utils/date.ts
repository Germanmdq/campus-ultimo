import { formatDistanceToNow as formatDistanceFn } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha en formato español legible
 * @example formatDate('2024-01-15T10:30:00Z') => '15 de enero de 2024, 10:30'
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea una fecha como tiempo relativo (ej: "hace 2 horas")
 * @example formatRelativeTime('2024-01-15T10:30:00Z') => 'hace 2 horas'
 */
export function formatRelativeTime(dateString: string): string {
  return formatDistanceFn(new Date(dateString), {
    addSuffix: true,
    locale: es
  });
}

/**
 * Formatea una fecha en formato corto
 * @example formatShortDate('2024-01-15T10:30:00Z') => '15/01/2024'
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES');
}
