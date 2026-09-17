/**
 * Supabase Storage bucket holding the voice recordings.
 *
 * `logs.audio_path` stores an object path relative to this bucket's root
 * (for example `isaac-wang-spraying.m4a`), never a full URL — see
 * supabase/migrations/0005_audio_path.sql for why.
 */
export const RECORDINGS_BUCKET = 'recordings';
