import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const isExternal = (v: string) => /^https?:\/\//.test(v);

/** Downloads and decodes the image so it shows at once when rendered (gives up after a few seconds). */
export function preloadImage(url: string, timeoutMs = 4000) {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => resolve();
    const timer = window.setTimeout(done, timeoutMs);
    img.onload = img.onerror = () => {
      window.clearTimeout(timer);
      done();
    };
    img.src = url;
    img.decode?.().then(done, () => {});
  });
}

/** profiles.avatar_url holds either an external URL (Google) or a path in the private avatars bucket. */
export function avatarUrlQuery(value: string | null | undefined) {
  return queryOptions({
    queryKey: ["avatar-url", value ?? null],
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
    queryFn: async () => {
      if (!value) return null;
      let url = value;
      if (!isExternal(value)) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(value, 60 * 60);
        if (error) throw error;
        url = data.signedUrl;
      }
      // Resolve only once the picture is in the browser cache, so it never pops in.
      await preloadImage(url);
      return url;
    },
  });
}

export function useAvatarUrl(value: string | null | undefined) {
  const { data } = useQuery({ ...avatarUrlQuery(value), enabled: !!value });
  return value ? (data ?? null) : null;
}

export async function uploadAvatar(userId: string, file: File, previous: string | null) {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("A foto deve ter no máximo 5 MB.");
  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error("Não foi possível enviar a foto.");
  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", userId);
  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error("Não foi possível salvar a foto no perfil.");
  }
  if (previous && !isExternal(previous) && previous.startsWith(`${userId}/`)) {
    void supabase.storage.from(BUCKET).remove([previous]);
  }
  return path;
}
