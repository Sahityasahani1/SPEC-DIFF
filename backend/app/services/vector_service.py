"""Dense Semantic + Sparse BM25 Hybrid Vector Search Engine with Reciprocal Rank Fusion (RRF)."""
from typing import List, Dict, Tuple, Optional, Any
import math
import re
from collections import Counter
import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Product

def create_product_document(product: Product) -> str:
    """
    Creates a multi-aspect structured document representation for hybrid retrieval.
    Structures attributes into Core Architecture, Ergonomics/Display, Indian Nuances, and Workloads.
    """
    aspect_architecture = (
        f"[Architecture] Brand: {product.brand} | Model: {product.name} | Category: {product.category} | "
        f"Processor CPU: {product.processor} | Graphics GPU: {product.gpu} | "
        f"Memory RAM: {product.ram_gb}GB | Storage: {product.storage_gb}GB SSD | "
        f"RAM Expandability: {product.ram_expandability}."
    )
    aspect_ergonomics = (
        f"[Ergonomics & Display] Screen: {product.display_tech} | "
        f"Battery Endurance: {product.battery_hours} hours | Chassis Weight: {product.weight_kg} kg."
    )
    aspect_market = (
        f"[Indian Market Nuances] Verified Street Price: ₹{product.price:,.0f} | "
        f"Software: {product.bundled_software} | Retail Store: {product.retail_source}."
    )
    aspect_workloads = (
        f"[Workloads & Real-World Context] Description: {product.description} | "
        f"Verified Pros: {product.pros} | Known Trade-offs: {product.cons}."
    )
    return f"{aspect_architecture} {aspect_ergonomics} {aspect_market} {aspect_workloads}"

import hashlib

def _stable_hash(token: str) -> int:
    """Deterministic token hash independent of Python process hash seed."""
    return int(hashlib.md5(token.encode("utf-8")).hexdigest()[:8], 16)

def generate_text_embedding(text: str, dim: int = 384) -> List[float]:
    """
    Generates a normalized 384-dimensional dense semantic embedding vector.
    Uses sublinear term frequency hashing across character and word n-grams
    with L2-normalization for consistent cosine distance computation.
    """
    words = text.lower().strip().split()
    vector = np.zeros(dim, dtype=np.float32)

    if not words:
        return vector.tolist()

    for idx, word in enumerate(words):
        # Base word hash
        h = _stable_hash(word) % dim
        vector[h] += 1.0 / (1.0 + 0.05 * idx)

        # Trigram hashes for morphological & typo resilience
        if len(word) >= 3:
            for i in range(len(word) - 2):
                tri = word[i:i + 3]
                h_tri = _stable_hash(tri) % dim
                vector[h_tri] += 0.4

    norm = float(np.linalg.norm(vector))
    if norm > 0:
        vector = vector / norm
    return vector.tolist()

def _tokenize(text: str) -> List[str]:
    """Extracts alphanumeric technical tokens, preserving hyphens and plus symbols."""
    return [w.lower() for w in re.findall(r"[a-zA-Z0-9_\-\+]+", text) if len(w) > 1]

class BM25Okapi:
    """Fast in-memory BM25 lexical ranking engine for exact technical hardware keywords."""
    def __init__(self, corpus: List[List[str]], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = len(corpus)
        self.avgdl = sum(len(doc) for doc in corpus) / max(1, self.corpus_size)
        self.doc_freqs = Counter()
        self.doc_lens = [len(doc) for doc in corpus]
        self.doc_term_freqs = []

        for doc in corpus:
            tf = Counter(doc)
            self.doc_term_freqs.append(tf)
            for token in tf:
                self.doc_freqs[token] += 1

        self.idf = {}
        for token, freq in self.doc_freqs.items():
            self.idf[token] = math.log((self.corpus_size - freq + 0.5) / (freq + 0.5) + 1.0)

    def score(self, query_tokens: List[str]) -> List[float]:
        scores = [0.0] * self.corpus_size
        for token in query_tokens:
            if token not in self.idf:
                continue
            idf_val = self.idf[token]
            for i, tf in enumerate(self.doc_term_freqs):
                term_count = tf.get(token, 0)
                if term_count > 0:
                    numerator = term_count * (self.k1 + 1.0)
                    denominator = term_count + self.k1 * (1.0 - self.b + self.b * (self.doc_lens[i] / self.avgdl))
                    scores[i] += idf_val * (numerator / denominator)
        return scores

async def search_pgvector_products(
    db: AsyncSession,
    query_vector: List[float],
    category: str = "laptop",
    max_budget: float = 10000000.0,
    min_ram_gb: int = 0,
    min_storage_gb: int = 0,
    brand: Optional[str] = None,
    limit: int = 20
) -> List[Tuple[Product, float]]:
    """
    Executes hybrid vector similarity search directly inside PostgreSQL using pgvector <=> cosine distance.
    Combines hard constraints directly in the SQL execution plan.
    """
    stmt = (
        select(Product, Product.embedding.cosine_distance(query_vector).label("distance"))
        .where(Product.in_stock == True)
        .where(Product.price <= max_budget)
        .where(Product.ram_gb >= min_ram_gb)
        .where(Product.storage_gb >= min_storage_gb)
    )
    if category and category != "all":
        stmt = stmt.where(Product.category == category)
    if brand and brand.lower() != "any":
        stmt = stmt.where(Product.brand.ilike(f"%{brand}%"))

    stmt = stmt.order_by("distance").limit(limit)
    result = await db.execute(stmt)
    rows = result.all()

    results = []
    for product, distance in rows:
        sim_score = max(0.0, min(100.0, (1.0 - (distance or 0.0)) * 100.0))
        results.append((product, round(sim_score, 1)))
    return results

class SemanticSearchEngine:
    """
    Hybrid Vector Retrieval Engine:
    Combines Dense Vector Semantic Matching + Sparse BM25 Term Matching
    using Reciprocal Rank Fusion (RRF) for human-expert hardware precision.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            sublinear_tf=True,
            stop_words="english",
            lowercase=True,
            min_df=1
        )
        self.is_fitted = False
        self.doc_ids = []
        self.tfidf_matrix = None
        self.bm25: Optional[BM25Okapi] = None
        self.corpus_tokens = []

    def index_products(self, products: List[Product]):
        """Fits vectorizer and BM25 index on current catalog documents."""
        if not products:
            self.is_fitted = False
            return

        docs = [create_product_document(p) for p in products]
        self.doc_ids = [p.id for p in products]
        self.tfidf_matrix = self.vectorizer.fit_transform(docs)
        self.corpus_tokens = [_tokenize(doc) for doc in docs]
        self.bm25 = BM25Okapi(self.corpus_tokens)
        self.is_fitted = True

    def compute_similarity(self, query: str, candidates: List[Product]) -> Dict[str, float]:
        """
        Computes hybrid relevance score in range [50.0, 98.0] for each candidate
        via Reciprocal Rank Fusion (RRF) across Dense Vector and Sparse BM25.
        """
        if not candidates:
            return {}

        candidate_docs = [create_product_document(p) for p in candidates]
        num_candidates = len(candidates)

        # 1. Dense Semantic Similarity
        all_texts = candidate_docs + [query]
        dyn_vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            stop_words="english",
            lowercase=True
        )
        matrix = dyn_vectorizer.fit_transform(all_texts)
        query_vector = matrix[-1]
        candidate_vectors = matrix[:-1]
        dense_sims = cosine_similarity(query_vector, candidate_vectors).flatten()

        # Dense rank ordering (higher is better rank 0..N-1)
        dense_order = np.argsort(-dense_sims)
        dense_ranks = {candidates[idx].id: rank for rank, idx in enumerate(dense_order)}

        # 2. Sparse Lexical BM25 Scoring
        tokenized_corpus = [_tokenize(doc) for doc in candidate_docs]
        cand_bm25 = BM25Okapi(tokenized_corpus)
        q_tokens = _tokenize(query)
        bm25_scores = cand_bm25.score(q_tokens)

        # BM25 rank ordering (higher is better rank 0..N-1)
        bm25_order = np.argsort(-np.array(bm25_scores))
        bm25_ranks = {candidates[idx].id: rank for rank, idx in enumerate(bm25_order)}

        # 3. Normalized Continuous Hybrid Fusion (80% Dense Semantic + 20% Sparse BM25)
        min_c, max_c = float(np.min(dense_sims)), float(np.max(dense_sims))
        norm_c = (dense_sims - min_c) / max(1e-5, (max_c - min_c))

        min_b = float(np.min(bm25_scores)) if len(bm25_scores) > 0 else 0.0
        max_b = float(np.max(bm25_scores)) if len(bm25_scores) > 0 else 1.0
        norm_b = (np.array(bm25_scores) - min_b) / max(1e-5, (max_b - min_b))

        alpha = 0.80
        hybrid_sim = alpha * norm_c + (1.0 - alpha) * norm_b

        final_scores = {}
        for i, p in enumerate(candidates):
            scaled = 50.0 + float(hybrid_sim[i]) * 45.0
            final_scores[p.id] = round(scaled, 1)

        return final_scores

# Global semantic engine singleton
semantic_engine = SemanticSearchEngine()
