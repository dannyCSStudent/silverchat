import * as ImagePicker from 'expo-image-picker';

import { mobileEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';

type UploadAvatarArgs = {
  file?: Blob | File | ArrayBuffer | null;
  base64?: string | null;
  mimeType?: string | null;
  uri: string;
  userId: string;
};

type UploadAvatarResult = {
  path: string;
  publicUrl: string;
};

function getFileExtension(mimeType?: string | null) {
  if (!mimeType) {
    return 'jpg';
  }

  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function base64ToArrayBuffer(base64: string) {
  const byteCharacters = globalThis.atob(base64);
  const byteNumbers = new Array<number>(byteCharacters.length);

  for (let index = 0; index < byteCharacters.length; index += 1) {
    byteNumbers[index] = byteCharacters.charCodeAt(index);
  }

  return new Uint8Array(byteNumbers).buffer;
}

async function readUploadBody(
  uri: string,
  mimeType: string,
  file?: Blob | File | ArrayBuffer | null,
  base64?: string | null,
): Promise<Blob | File | ArrayBuffer> {
  if (file) {
    return file;
  }

  if (base64) {
    return base64ToArrayBuffer(base64);
  }

  return fetch(uri).then((response) => response.arrayBuffer());
}

export async function pickAvatarAsset() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to choose an avatar.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    base64: true,
    aspect: [1, 1],
    mediaTypes: ['images'],
    quality: 0.7,
    selectionLimit: 1,
  });

  if (result.canceled || !result.assets.length) {
    return null;
  }

  return result.assets[0];
}

export async function uploadAvatar({
  file,
  base64,
  mimeType,
  uri,
  userId,
}: UploadAvatarArgs): Promise<UploadAvatarResult> {
  const extension = getFileExtension(mimeType);
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const uploadBody = await readUploadBody(uri, mimeType ?? 'image/jpeg', file, base64);

  const uploadResult = await supabase.storage
    .from(mobileEnv.avatarBucket)
    .upload(path, uploadBody as unknown as Blob, {
      contentType: mimeType ?? 'image/jpeg',
      upsert: true,
    });

  if (uploadResult.error) {
    throw new Error(
      `Avatar upload failed for bucket "${mobileEnv.avatarBucket}": ${uploadResult.error.message}`,
    );
  }

  const { data } = supabase.storage.from(mobileEnv.avatarBucket).getPublicUrl(path);
  return {
    path,
    publicUrl: data.publicUrl,
  };
}
