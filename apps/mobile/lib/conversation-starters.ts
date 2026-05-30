type ConversationStarterInput = {
  memberName?: string | null;
  countryCode?: string | null;
  pool?: 'preferred' | 'fallback' | 'queue' | null;
  sharedTopics?: string[];
  topSharedCategory?: string | null;
  topSharedInterest?: string | null;
};

function formatTopic(topic: string) {
  return topic.trim().toLowerCase();
}

export function buildConversationStarters({
  memberName,
  countryCode,
  pool,
  sharedTopics = [],
  topSharedCategory,
  topSharedInterest,
}: ConversationStarterInput) {
  const name = memberName?.trim() || 'this member';
  const country = countryCode?.trim().toUpperCase() || null;
  const topics = [...new Set(sharedTopics.map(formatTopic).filter(Boolean))].slice(0, 3);
  const starters: string[] = [];

  if (pool === 'preferred') {
    starters.push('You have a strong local signal. Open with something specific and easy to answer.');
  } else if (pool === 'fallback') {
    starters.push('This match used broader signals, so keep the opener friendly and low pressure.');
  } else if (pool === 'queue') {
    starters.push('Use a simple opener while the queue is still looking for a better fit.');
  }

  if (topics.length > 0) {
    const firstTopic = topics[0];
    starters.push(`Ask ${name} how they got into ${firstTopic}.`);
    if (topics.length > 1) {
      starters.push(`Ask whether ${topics[1]} or ${firstTopic} is the current favorite.`);
    }
    starters.push(`Ask what they enjoy most about ${firstTopic}.`);
  } else if (topSharedCategory || topSharedInterest) {
    const category = topSharedCategory?.trim().toLowerCase() ?? 'that topic';
    const interest = topSharedInterest?.trim().toLowerCase() ?? null;
    starters.push(
      interest
        ? `Ask ${name} what they like most about ${interest}.`
        : `Ask ${name} what got them interested in ${category}.`,
    );
    starters.push(`Ask what usually makes ${category} a good conversation starter for them.`);
  } else {
    starters.push(`Ask ${name} what they’ve been enjoying lately.`);
    starters.push(`Ask what usually makes a conversation feel comfortable for them.`);
  }

  if (country) {
    starters.push(`Ask what they like most about living in ${country}.`);
  }

  return starters.slice(0, 3);
}
