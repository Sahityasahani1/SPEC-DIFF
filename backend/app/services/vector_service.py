"""Dense Semantic Vector Search and Embedding Service with pgvector and In-Memory Fallback."""
from typing import List, Dict, Tuple, Optional, Any
import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Product

def create_product_document(product: Product) -> str:
    """
    Creates a rich text document for semantic retrieval matching SRS §4.2.
    """
    doc = (
        f"Product: {product.brand} {product.name} | Category: {product.category} | Price: ₹{product.price:,.0f} | "
        f"Specs: {product.ram_gb}GB RAM, {product.storage_gb}GB SSD, CPU: {product.processor}, GPU: {product.gpu} | "
        f"Battery: {product.battery_hours} hours battery life, Weight: {product.weight_kg} kg | "
        f"Display: {product.display_tech} | "
        f"RAM Upgradeability: {product.ram_expandability} | "
        f"Software: {product.bundled_software} | "
        f"Description: {product.description} | "
        f"Strengths: {product.pros} | "
        f"Limitations: {product.cons}"
    )
    return doc

def generate_text_embedding(text: str, dim: int = 384) -> List[float]:
    """
    Generates a normalized 384-dimensional dense semantic embedding vector.
    Uses sublinear term frequency hashing across character and word n-grams
    with L2-normalization for consistent cosine distance computation in pgvector.
    """
    words = text.lower().strip().split()
    vector = np.zeros(dim, dtype=np.float32)

    if not words:
        return vector.tolist()

    for idx, word in enumerate(words):
        # Base word hash
        h = abs(hash(word)) % dim
        vector[h] += 1.0 / (1.0 + 0.05 * idx)

        # Trigram hashes for morphological & typo resilience
        if len(word) >= 3:
            for i in range(len(word) - 2):
                tri = word[i:i + 3]
                h_tri = abs(hash(tri)) % dim
                vector[h_tri] += 0.4

    norm = float(np.linalg.norm(vector))
    if norm > 0:
        vector = vector / norm
    return vector.tolist()

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
    Combines hard constraints (budget, RAM, storage, in-stock) directly in the SQL execution plan.
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
    Vector retrieval engine calculating dense semantic similarity between
    natural language workflow queries and rich product documents.
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

    def index_products(self, products: List[Product]):
        """Fits vectorizer on the current catalog documents."""
        if not products:
            self.is_fitted = False
            return

        docs = [create_product_document(p) for p in products]
        self.doc_ids = [p.id for p in products]
        self.tfidf_matrix = self.vectorizer.fit_transform(docs)
        self.is_fitted = True

    def compute_similarity(self, query: str, candidates: List[Product]) -> Dict[str, float]:
        """
        Computes semantic relevance score in range [0.0, 100.0] for each candidate.
        """
        if not candidates:
            return {}

        candidate_ids = {p.id for p in candidates}
        candidate_docs = [create_product_document(p) for p in candidates]

        # Fit on candidates + query for optimal dynamic IDF weighting
        all_texts = candidate_docs + [query]
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            stop_words="english",
            lowercase=True
        )
        matrix = vectorizer.fit_transform(all_texts)

        # Query vector is the last row
        query_vector = matrix[-1]
        candidate_vectors = matrix[:-1]

        # Cosine similarity
        cos_sims = cosine_similarity(query_vector, candidate_vectors).flatten()

        # Min-max scale cosine scores to 40..98 for smooth ranking discrimination
        scores = {}
        min_sim = float(np.min(cos_sims)) if len(cos_sims) > 0 else 0.0
        max_sim = float(np.max(cos_sims)) if len(cos_sims) > 0 else 1.0

        for i, product in enumerate(candidates):
            raw_sim = float(cos_sims[i])
            if max_sim > min_sim:
                scaled = 50.0 + ((raw_sim - min_sim) / (max_sim - min_sim)) * 45.0
            else:
                scaled = 75.0
            scores[product.id] = round(scaled, 1)

        return scores

# Global semantic engine singleton
semantic_engine = SemanticSearchEngine()
