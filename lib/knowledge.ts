export type KnowledgeEntry = { id: string; title: string; content: string; tags: string[] };
export type KnowledgeResult = KnowledgeEntry & { score: number; source: "vector" | "keyword" };
const embeddingCache = new Map<string, number[]>();

export const knowledge: KnowledgeEntry[] = [
  { id: "llm", title: "¿Qué es un LLM?", content: "Un LLM es un modelo de lenguaje grande que aprende patrones de texto para comprender y generar respuestas. En Dominga interpreta la conversación, pero no debe ser la autoridad de precios.", tags: ["llm", "modelo", "ia", "teoria"] },
  { id: "rag", title: "¿Qué es RAG?", content: "RAG significa Retrieval-Augmented Generation. Primero recupera información relevante desde una fuente de conocimiento y luego se la entrega al modelo para responder con contexto. Así reducimos respuestas inventadas.", tags: ["rag", "contexto", "teoria", "conocimiento"] },
  { id: "prompt", title: "¿Qué es un prompt?", content: "Es la instrucción y el contexto que recibe el modelo. Un buen prompt define el rol, las reglas, el formato de salida y los límites del asistente.", tags: ["prompt", "teoria", "instrucciones"] },
  { id: "guardrails", title: "¿Por qué validar con código?", content: "El modelo interpreta lenguaje, pero la aplicación valida productos, precios, promociones y confirmaciones. Separar ambas responsabilidades hace el sistema más confiable.", tags: ["validacion", "seguridad", "pedidos", "teoria"] },
  { id: "local", title: "¿Por qué Ollama?", content: "Ollama permite ejecutar modelos localmente. Es útil en el taller porque no requiere API key y las conversaciones permanecen en la computadora.", tags: ["ollama", "local", "privacidad", "teoria"] }
];

export function retrieveKeywordKnowledge(query: string): KnowledgeResult[] {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  return knowledge
    .map((entry) => ({ entry, score: terms.reduce((score, term) => score + (entry.title.toLowerCase().includes(term) || entry.tags.includes(term) || entry.content.toLowerCase().includes(term) ? 1 : 0), 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => ({ ...item.entry, score: item.score, source: "keyword" as const }));
}

function cosineSimilarity(left: number[], right: number[]) {
  const dot = left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
  const leftMagnitude = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightMagnitude = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  return leftMagnitude && rightMagnitude ? dot / (leftMagnitude * rightMagnitude) : 0;
}

async function embedMany(texts: string[]) {
  const missing = texts.filter((text) => !embeddingCache.has(text));
  if (!missing.length) return texts.map((text) => embeddingCache.get(text)!);
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1").replace(/\/v1\/?$/, "");
  const response = await fetch(`${baseUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text", input: missing }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Ollama embeddings respondió ${response.status}.`);
  const data = await response.json() as { embeddings?: number[][] };
  if (!data.embeddings?.length || data.embeddings.length !== missing.length) throw new Error("Ollama no devolvió todos los embeddings.");
  missing.forEach((text, index) => embeddingCache.set(text, data.embeddings![index]));
  return texts.map((text) => embeddingCache.get(text)!);
}

export async function retrieveKnowledge(query: string): Promise<{ results: KnowledgeResult[]; source: "vector" | "keyword" }> {
  try {
    const documents = knowledge.map((entry) => `${entry.title}. ${entry.content}. Etiquetas: ${entry.tags.join(", ")}`);
    const [queryEmbedding, ...documentEmbeddings] = await embedMany([query, ...documents]);
    const vectorResults = knowledge.map((entry, index) => ({
      entry,
      score: cosineSimilarity(queryEmbedding, documentEmbeddings[index])
    }));
    return {
      results: vectorResults.sort((a, b) => b.score - a.score).slice(0, 3).map(({ entry, score }) => ({ ...entry, score, source: "vector" as const })),
      source: "vector"
    };
  } catch (error) {
    console.warn("RAG vectorial no disponible; usando recuperación por palabras clave.", error);
    return { results: retrieveKeywordKnowledge(query), source: "keyword" };
  }
}
