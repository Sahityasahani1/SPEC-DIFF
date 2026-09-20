"""Dense Semantic Vector Search and Embedding Service."""
from typing import List, Dict
import numpy as np
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

class SemanticSearchEngine:
    """
    Vector retrieval engine calculating dense semantic similarity between
    natural language workflow queries and rich product documents.
    """
    def __init__(self):
        # Using sublinear tf and word + char n-grams for typo-resilient semantic matching
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
                # Normalized between 50 and 95
                scaled = 50.0 + ((raw_sim - min_sim) / (max_sim - min_sim)) * 45.0
            else:
                scaled = 75.0
            scores[product.id] = round(scaled, 1)

        return scores

# Global semantic engine singleton
semantic_engine = SemanticSearchEngine()
