export interface SemanticCandidate {
  patternId: string;
  embedding: readonly number[];
}

export interface SemanticMatch {
  patternId: string;
  similarity: number;
}

export interface SemanticPatternDetectorOptions {
  minimumSimilarity?: number;
  maximumMatches?: number;
}

export class SemanticPatternDetector {
  private readonly minimumSimilarity: number;
  private readonly maximumMatches: number;

  constructor(options: SemanticPatternDetectorOptions = {}) {
    this.minimumSimilarity = options.minimumSimilarity ?? 0.86;
    this.maximumMatches = options.maximumMatches ?? 5;
  }

  detect(queryEmbedding: readonly number[], candidates: readonly SemanticCandidate[]): SemanticMatch[] {
    validateVector(queryEmbedding, "queryEmbedding");

    return candidates
      .map((candidate) => {
        validateVector(candidate.embedding, `candidate:${candidate.patternId}`);
        if (candidate.embedding.length !== queryEmbedding.length) {
          throw new Error(`Embedding dimension mismatch for ${candidate.patternId}`);
        }
        return {
          patternId: candidate.patternId,
          similarity: cosineSimilarity(queryEmbedding, candidate.embedding),
        };
      })
      .filter((match) => match.similarity >= this.minimumSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.maximumMatches);
  }
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("Cosine similarity requires non-empty vectors with equal dimensions.");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const av = a[index]!;
    const bv = b[index]!;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function validateVector(vector: readonly number[], name: string): void {
  if (vector.length === 0) throw new Error(`${name} cannot be empty.`);
  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error(`${name} contains a non-finite value.`);
  }
}
