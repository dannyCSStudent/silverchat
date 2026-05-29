export function formatRelativeAge(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  const diffMinutes = Math.round((Date.now() - timestamp.getTime()) / 60000);

  if (diffMinutes <= 0) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatRelativeTimestamp(value: string | null | undefined) {
  const age = formatRelativeAge(value);

  return age ? `Updated ${age}` : null;
}
