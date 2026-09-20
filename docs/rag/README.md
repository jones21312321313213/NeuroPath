# NeuroPath RAG System: Documentation & Technical Specifications

> [!NOTE]
> **Specification & Roadmap Status:** This document details the planned RAG architecture and knowledge base design for future integration. Runtime models, pgvector migrations, and retrieval services are scheduled under Sprint roadmap item KAN-8 and are not part of the active production runtime.

## 1. Overview
NeuroPath's Retrieval-Augmented Generation (RAG) system upgrades **Module 2 (AI-Based IEP Generation)** and **Module 3 (Instructional Support)** from zero-shot prompt generation to an authoritative, context-grounded retrieval architecture.

The RAG engine grounds all generated Individualized Education Program (IEP) goals, lesson plans, and instructional strategies in **DepEd Region VII Special Education (SPED) guidelines**, **DepEd Order No. 021, s. 2020** (K to 12 Transition Curriculum Framework for Learners with Disabilities), and evidence-based Autism Spectrum Disorder (ASD) practices.

```mermaid
flowchart LR
    A["Teacher Input (PLAAFP)"] --> B["PII Scrubber (RA 10173)"]
    B --> C["Semantic Hybrid Retriever"]
    C --> D[("PostgreSQL + pgvector<br/>(HNSW Index)")]
    D --> C
    C --> E["Context Injection Engine"]
    E --> F["LLM Router<br/>(Ollama / Groq)"]
    F --> G["R-GORI Validator<br/>(>=80% Threshold)"]
    G --> H["Teacher Review Interface"]
```

---

## 2. Target Design Benchmarks & Pedagogical Objectives
*(Design objectives subject to empirical validation upon KAN-8 implementation)*

| Metric / Requirement | Target Benchmark | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Standard IEP Generation Latency** | $\le 10\text{ seconds}$ | HNSW approximate indexing, embedding caching, small-model routing |
| **Full Document Generation Latency** | $\le 30\text{ seconds}$ | Concurrent visual aid dispatch & batched section drafting |
| **Generation Hard Timeout** | $45\text{ seconds}$ | Client-side abort with automatic draft retention in IndexedDB |
| **Pedagogical Quality Standard** | $\ge 80\%$ compliance | Automated post-generation audit via `RGORICheckerService` |
| **Minor Data Privacy Compliance** | $100\%$ compliance target | Ephemeral regex/token surrogate PII scrubber (RA 10173) |
| **Third-Party Data Retention** | Zero Data Retention (ZDR) | Stateless API terms; no training on minor learner data |

---

## 3. Documentation Suite Index

| Document | Scope & Contents |
| :--- | :--- |
| **[Architecture & Vector Storage](architecture.md)** | End-to-end component topology, PostgreSQL `pgvector` data model, HNSW indexing, chunking strategy, and Django ORM definitions. |
| **[DepEd Frameworks & ASD Pedagogies](deped_asd_frameworks.md)** | Domain taxonomies across 6 developmental areas, DepEd DO 21 s. 2020 curriculum packages, ASD EBPs (TEACCH, PECS, PBIS), and R-GORI rubrics. |
| **[Third-Party Services & Security](third_party_services.md)** | Multi-tier LLM routing, embedding providers, caching mechanisms, and the RA 10173 PII de-identification boundary. |
| **[Pedagogical Query Pipeline](query_pipeline.md)** | PLAAFP feature extraction, metadata-filtered hybrid vector search, dynamic context injection prompts, and the automated R-GORI repair loop. |

---

## 4. Quickstart for Developers

### 4.1 Database Vector Extension
Ensure PostgreSQL has the `vector` extension enabled:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4.2 Environment Configuration
Verify your backend `.env` file contains the active AI service keys:
```env
GEMINI_API_KEY=your_gemini_api_key        # Primary LLM generation tier
GROQ_API_KEY=your_groq_api_key            # Cloud fallback tier
OLLAMA_HOST=http://localhost:11434        # Optional local Ollama server
OPENAI_API_KEY=your_openai_api_key        # Future embedding generation (KAN-8)
```

### 4.3 Ingestion Management Command
Seed the curated SPED knowledge base into PostgreSQL:
```bash
python manage.py seed_rag_knowledge --file iep_management/data/seed_sped_knowledge.json
```
