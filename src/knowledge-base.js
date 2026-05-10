import { KNOWLEDGE_TOPICS } from "../knowledge/topics.js";

const FALLBACK_TOPIC_IDS = ["validity_argument", "safety_privacy"];

export function listKnowledgeTopics() {
  return KNOWLEDGE_TOPICS.map(cloneTopic);
}

export function retrieveKnowledge(query, options = {}) {
  const topics = options.topics ?? KNOWLEDGE_TOPICS;
  const text = serializeQuery(query);
  const tokens = tokenize(text);
  const topN = options.topN ?? 5;

  const scored = topics
    .map((topic) => {
      const retrievalTerms = retrievalTermsFor(topic);
      const matchedKeywords = retrievalTerms.filter((term) => text.includes(term.toLowerCase()));
      const tokenMatches = retrievalTerms.filter((term) => tokens.has(term.toLowerCase()));
      const relatedMatches = (topic.relatedAnalyses ?? []).filter((id) => text.includes(id.toLowerCase()));
      const score = matchedKeywords.length * 2 + tokenMatches.length + relatedMatches.length * 3;
      return {
        topic,
        score,
        matchedKeywords: [...new Set([...matchedKeywords, ...tokenMatches, ...relatedMatches])]
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.topic.id.localeCompare(b.topic.id))
    .slice(0, topN)
    .map(({ topic, score, matchedKeywords }) => ({
      ...cloneTopic(topic),
      matchedKeywords,
      score
    }));

  if (scored.length > 0) {
    return scored;
  }

  return FALLBACK_TOPIC_IDS
    .map((id) => topics.find((topic) => topic.id === id))
    .filter(Boolean)
    .map((topic) => ({
      ...cloneTopic(topic),
      matchedKeywords: [],
      score: 0
    }));
}

export function validateKnowledgeTopics(topics = KNOWLEDGE_TOPICS) {
  const issues = [];
  const seenIds = new Set();

  topics.forEach((topic, index) => {
    const label = topic?.id ?? `topic[${index}]`;

    if (!topic || typeof topic !== "object") {
      issues.push(`${label}: topic must be an object`);
      return;
    }
    if (!nonEmptyString(topic.id)) {
      issues.push(`${label}: id is required`);
    } else if (seenIds.has(topic.id)) {
      issues.push(`${label}: duplicate id`);
    } else {
      seenIds.add(topic.id);
    }
    if (!nonEmptyString(topic.title)) {
      issues.push(`${label}: title is required`);
    }
    if (!nonEmptyString(topic.summary)) {
      issues.push(`${label}: summary is required`);
    }
    if (!Array.isArray(topic.keywords) || topic.keywords.length === 0) {
      issues.push(`${label}: keywords must be a non-empty array`);
    }
    if (!Array.isArray(topic.checks) || topic.checks.length === 0) {
      issues.push(`${label}: checks must be a non-empty array`);
    }
  });

  return issues;
}

function retrievalTermsFor(topic) {
  return [
    topic.id,
    topic.title,
    ...(topic.relatedAnalyses ?? []),
    ...(topic.keywords ?? [])
  ].filter(nonEmptyString);
}

function cloneTopic(topic) {
  const clone = { ...topic };
  for (const field of ["keywords", "checks", "relatedAnalyses", "useWhen"]) {
    if (Array.isArray(topic[field])) {
      clone[field] = [...topic[field]];
    }
  }
  return clone;
}

function serializeQuery(query) {
  if (query === null || query === undefined) {
    return "";
  }
  if (typeof query === "string") {
    return query.toLowerCase();
  }
  if (Array.isArray(query)) {
    return query.map(serializeQuery).join(" ").toLowerCase();
  }
  if (typeof query === "object") {
    return Object.values(query).map(serializeQuery).join(" ").toLowerCase();
  }
  return String(query).toLowerCase();
}

function tokenize(text) {
  return new Set(text.split(/[^\p{L}\p{N}.]+/u).filter(Boolean));
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
