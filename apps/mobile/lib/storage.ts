import * as ImagePicker from 'expo-image-picker';

import { mobileEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';

type UploadAvatarArgs = {
  file?: Blob | File | null;
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

export async function pickAvatarAsset() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to choose an avatar.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
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
  mimeType,
  uri,
  userId,
}: UploadAvatarArgs): Promise<UploadAvatarResult> {
  const extension = getFileExtension(mimeType);
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const uploadBody: Blob | File = file ?? (await fetch(uri).then((response) => response.blob()));

  const uploadResult = await supabase.storage
    .from(mobileEnv.avatarBucket)
    .upload(path, uploadBody, {
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
