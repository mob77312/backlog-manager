/**
 * Konstanta sistem - centralized agar tidak tersebar sebagai magic strings.
 */

/** ID project sistem untuk task tanpa parent (Project Internal PGNCOM). */
export const INTERNAL_PROJECT_ID = 'prj_internal_pgncom'

/** Status default saat task baru dibuat tanpa konteks. */
export const DEFAULT_STATUS_KEY = 'backlog'

/** Stage L0 default saat task dibuat tanpa konteks (Board Divisi tanpa stage filter). */
export const DEFAULT_STAGE = 'build_to_operate' as const
