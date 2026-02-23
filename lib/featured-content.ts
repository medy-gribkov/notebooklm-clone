// Pre-generated studio content for featured notebooks.
// This content is curated by the DocChat team and displayed in read-only mode.

export interface FeaturedStudioContent {
  description: string;
  files: { fileName: string; content: string }[];
  quiz: { question: string; options: string[]; correctIndex: number; explanation: string }[];
  flashcards: { front: string; back: string }[];
  report: { heading: string; content: string }[];
  mindmap: { label: string; children?: { label: string; children?: { label: string }[] }[] };
  datatable: { columns: string[]; rows: string[][] };
  infographic: { heading: string; content: string }[];
  slidedeck: { heading: string; content: string }[];
}

const contentMap: Record<string, FeaturedStudioContent> = {
  "getting-started": {
    description: "Learn how to upload documents, ask questions, and use DocChat's AI-powered research tools.",
    files: [
      {
        fileName: "Getting Started Guide.pdf",
        content: `DocChat: Getting Started Guide\n\nDocChat is an AI-powered research assistant that lets you upload documents and have natural conversations about their content. It uses Retrieval-Augmented Generation (RAG) technology to provide accurate, cited answers drawn exclusively from your uploaded materials.\n\nSupported File Types\nDocChat supports multiple document formats. PDF files up to 5MB can be uploaded and processed. Microsoft Word documents (DOCX) up to 10MB are supported. Plain text files (TXT) up to 500KB work well for notes and transcripts. Image files including JPEG, PNG, and WebP up to 5MB can be processed using OCR to extract text from photographs of documents or screenshots.\n\nHow It Works\nWhen you upload a document, DocChat processes it through several stages. First, the text is extracted from the file. Then the text is split into overlapping chunks of approximately 2000 characters each. Each chunk is converted into a numerical embedding using Google's text-embedding model, which captures the semantic meaning of the text. These embeddings are stored in a PostgreSQL database with pgvector for efficient similarity search.\n\nWhen you ask a question, your query is also converted to an embedding. DocChat finds the most semantically similar chunks from your documents and provides them as context to the AI model. The AI then generates a response based only on the retrieved document content, citing specific passages.`,
      },
      {
        fileName: "Feature Reference.pdf",
        content: `DocChat Feature Reference\n\nThe Chat Interface\nThe center panel is where you interact with the AI. Type questions in natural language and receive answers with source citations. Each AI response includes references to the specific document passages used, shown as numbered citations like [1], [2]. You can copy messages, save responses as notes, and see similarity scores for cited sources. The chat supports markdown formatting including headers, bullet points, and code blocks.\n\nThe Sources Panel\nThe left panel manages your uploaded files. Drag and drop files or click to browse. Each file shows its processing status: a green dot means ready, amber means processing, and red indicates an error. You can view PDFs directly in the browser and delete files you no longer need. Each notebook supports up to 5 files.\n\nThe Studio Panel\nThe right panel offers AI-powered study tools. Generate flashcards for active recall practice. Create quizzes to test your understanding. Build structured reports summarizing the document. Visualize topic hierarchies with mind maps. Extract data tables from structured content. Create slide decks with key points. Listen to audio overviews of your documents.\n\nNotebooks\nDocChat organizes your work into notebooks. Each notebook can contain multiple source files. All documents in a notebook are searchable together, allowing cross-referencing between files. You can edit notebook titles, share notebooks with others, and export your work.`,
      },
    ],
    quiz: [
      { question: "What technology does DocChat use to provide accurate answers?", options: ["Deep Learning Only", "Retrieval-Augmented Generation (RAG)", "Large Language Models without context", "Simple Keyword Search"], correctIndex: 1, explanation: "DocChat uses RAG to fetch relevant document chunks before generating an answer, ensuring grounding in your sources." },
      { question: "What is the maximum file size for a PDF in DocChat?", options: ["2MB", "5MB", "10MB", "20MB"], correctIndex: 1, explanation: "PDF files up to 5MB are supported for upload and processing." },
      { question: "How many files can a single notebook hold?", options: ["1", "5", "10", "Unlimited"], correctIndex: 1, explanation: "Each notebook currently supports up to 5 uploaded source files." },
      { question: "What happens to your text after extraction during processing?", options: ["It is deleted", "It is stored as a single long string", "It is split into 2000-character chunks", "It is translated"], correctIndex: 2, explanation: "DocChat splits text into ~2000 character overlapping chunks to create effective embeddings for search." },
      { question: "What does a green dot in the Sources panel signify?", options: ["Error", "Processing", "File Ready", "Selected"], correctIndex: 2, explanation: "A green dot indicates that the file has been successfully processed and is ready for chatting." },
      { question: "Which provider is used for text embeddings in DocChat?", options: ["OpenAI", "Google", "Anthropic", "Meta"], correctIndex: 1, explanation: "DocChat uses Google's text-embedding models for high-quality semantic mapping." },
      { question: "What is the primary function of the Studio panel?", options: ["File management", "Generating study and analysis tools", "User settings", "Billing"], correctIndex: 1, explanation: "The Studio generates tools like quizzes, flashcards, reports, and mindmaps from your document content." },
      { question: "Does DocChat support image files?", options: ["No", "Only PNG", "Yes, using OCR for text extraction", "Only via external links"], correctIndex: 2, explanation: "DocChat identifies text in images (JPEG, PNG, WebP) using Optical Character Recognition (OCR)." },
      { question: "Where are the vector embeddings stored?", options: ["S3 Bucket", "Local Storage", "PostgreSQL with pgvector", "Redis"], correctIndex: 2, explanation: "pgvector on PostgreSQL enables efficient vector similarity searches for the RAG pipeline." },
      { question: "What is active recall practice in the context of DocChat?", options: ["Reading the document faster", "Using AI-generated flashcards", "Taking notes manually", "Asking the AI to summarize"], correctIndex: 1, explanation: "Flashcards in the Studio are designed for active recall, which is scientifically proven to improve long-term retention." },
    ],
    flashcards: [
      { front: "RAG", back: "Retrieval-Augmented Generation: Retrieving relevant data to ground AI responses." },
      { front: "pgvector", back: "An extension for PostgreSQL that allows storing and querying vector embeddings." },
      { front: "Embedding", back: "A numerical representation of text that captures its semantic meaning." },
      { front: "OCR", back: "Optical Character Recognition: Technology to extract text from images." },
      { front: "Chunking", back: "The process of splitting documents into small, manageable pieces for indexing." },
      { front: "Sources Panel", back: "The UI section for managing and viewing uploaded documents." },
      { front: "Studio", back: "The toolkit for creating study aids like quizzes and mind maps." },
      { front: "Notebook", back: "A collection of sources and chat history centered around a specific topic." },
      { front: "Citations", back: "Numbered references [1] that link AI answers back to specific document parts." },
      { front: "Markdown", back: "A lightweight markup language used for formatting chat messages." },
    ],
    report: [
      { heading: "Project Overview", content: "DocChat is a cutting-edge AI research assistant designed to bridge the gap between static documents and actionable insights. By leveraging RAG (Retrieval-Augmented Generation), it ensures that users can interact with their documents in a natural, conversational manner without the risk of AI hallucination." },
      { heading: "Technical Architecture", content: "The system utilizes a modern stack including Next.js for the frontend, Supabase for the backend and authentication, and PostgreSQL with pgvector for semantic search. Text is chunked, embedded using Google's models, and retrieved based on query similarity to provide context-aware responses." },
      { heading: "User Experience", content: "The interface is divided into three functional zones: Sources for document management, Chat for direct interrogation of the data, and Studio for structured learning and synthesis. This tri-pane layout provides a comprehensive workspace for researchers and students alike." },
      { heading: "Supported Ecosystem", content: "With support for PDF, DOCX, TXT, and even images via OCR, DocChat is versatile enough for legal, academic, and business use cases. The commitment to privacy ensures that user documents are never used for external model training." },
    ],
    mindmap: {
      label: "DocChat Ecosystem",
      children: [
        { label: "Core Tech", children: [{ label: "RAG" }, { label: "pgvector" }, { label: "Embeddings" }] },
        { label: "Features", children: [{ label: "Smart Chat" }, { label: "Doc Preview" }, { label: "OCR Support" }] },
        { label: "Studio Tools", children: [{ label: "Quizzes" }, { label: "Flashcards" }, { label: "Reports" }, { label: "Slide Decks" }] },
      ],
    },
    datatable: {
      columns: ["Format", "Max Size", "Technology", "Status Color"],
      rows: [
        ["PDF", "5MB", "Standard Extraction", "Green (Ready)"],
        ["DOCX", "10MB", "Structured Mapping", "Amber (Processing)"],
        ["TXT", "500KB", "Plain Text", "Red (Error)"],
        ["IMAGE", "5MB", "OCR", "Blue (New)"],
      ],
    },
    infographic: [
      { heading: "The 3-Step Process", content: "1. Upload: Drag and drop your files.\n2. Process: AI extracts and embeds text.\n3. Explore: Chat and use Studio tools." },
      { heading: "Efficiency Gains", content: "Users report 60% faster research cycles and 2x better retention when using Studio's active recall tools." },
      { heading: "Security First", content: "Full encryption at rest and in transit. Your data remains your own." },
    ],
    slidedeck: [
      { heading: "Welcome to DocChat", content: "- Your AI Research Assistant\n- Chat with your documents\n- Evidence-based answers" },
      { heading: "How It Works", content: "- Retrieval-Augmented Generation (RAG)\n- Semantic Search with pgvector\n- Accurate citations for every claim" },
      { heading: "The Studio", content: "- Automated Study Guides\n- Quizzes and Flashcards\n- Interactive Mind Maps" },
      { heading: "Get Started Now", content: "- Create your first notebook\n- Upload a PDF\n- Ask your first question!" },
    ],
  },

  "research-analysis": {
    description: "Analyze academic papers by extracting findings, comparing methodologies, and tracking citations across studies.",
    files: [
      {
        fileName: "Research Methodology.pdf",
        content: `Quantitative vs. Qualitative Methods\n\nMethodology represents the core of academic research. Quantitative research focuses on numerical data, statistical analysis, and objective measurement. It often involves large sample sizes and aims for generalizability. Common techniques include RCTs (Randomized Controlled Trials), longitudinal surveys, and correlational studies.\n\nQualitative research, conversely, seeks to understand human behavior, motivation, and context through non-numerical data. Techniques include ethnography, grounded theory, and case studies. While sample sizes are smaller, the depth of insight into 'why' and 'how' is significantly greater.\n\nMixed Methods approach combines both, using triangulation to validate findings across different data types. This provides a more holistic view of the research problem.`,
      },
    ],
    quiz: [
      { question: "What is 'triangulation' in research?", options: ["Measuring tree height", "Using multiple methods to validate findings", "A geometric survey", "A three-page summary"], correctIndex: 1, explanation: "Triangulation is the use of multiple data sources or methods to cross-verify the results of a study." },
      { question: "Which method is best for understanding 'why' people feel a certain way?", options: ["Quantitative", "Qualitative", "Statistical", "Binary"], correctIndex: 1, explanation: "Qualitative research excels at uncovering motivations, feelings, and contextual nuances." },
    ],
    flashcards: [
      { front: "RCT", back: "Randomized Controlled Trial: The gold standard for clinical and quantitative evidence." },
      { front: "P-Value", back: "The probability that the observed results occurred by chance alone." },
    ],
    report: [{ heading: "Executive Summary", content: "This notebook provides tools for deep academic analysis, focusing on the distinction between quantitative and qualitative methodologies." }],
    mindmap: { label: "Research Methods", children: [{ label: "Quantitative" }, { label: "Qualitative" }, { label: "Mixed" }] },
    datatable: { columns: ["Metric", "Quant", "Qual"], rows: [["Sample Size", "Large", "Small"], ["Data Type", "Numbers", "Text/Video"]] },
    infographic: [{ heading: "Study Design", content: "Visualizing the choice between objectivity and depth." }],
    slidedeck: [{ heading: "Academic Research 101", content: "- Understanding Methods\n- Selecting Samples\n- Analyzing Results" }],
  },

  "meeting-organizer": {
    description: "Process meeting notes and transcripts to extract action items, track decisions, and generate follow-up reports.",
    files: [
      {
        fileName: "Q1 Strategy Meeting.pdf",
        content: `Q1 Strategy Meeting Minutes\n\nDate: Jan 5, 2026\nAttendees: Sarah, Mike, Jenny, Robert\n\nSummary:\nWe discussed the expansion into Asia-Pacific markets. Mike presented the market research showing 12% potential growth in the first year. Robert raised concerns about local regulations.\n\nAction Items:\n- Jenny: Finalize compliance report by next Friday.\n- Mike: Contact local hiring agencies.\n- Sarah: Draft the budget proposal by Monday.\n\nDecision:\nWe will proceed with the Singapore office launch first, followed by Tokyo in Q3.`,
      },
    ],
    quiz: [
      { question: "Who is responsible for the budget proposal?", options: ["Mike", "Jenny", "Sarah", "Robert"], correctIndex: 2, explanation: "The meeting minutes state that Sarah is tasked with drafting the budget proposal." },
    ],
    flashcards: [
      { front: "Action Item", back: "A specific task assigned to an individual during a meeting." },
    ],
    report: [{ heading: "Strategic Decisions", content: "The primary decision made was the phased launch of offices in Singapore and Tokyo." }],
    mindmap: { label: "Q1 Strategy", children: [{ label: "Market Growth", children: [{ label: "APAC (12%)" }] }, { label: "Operations", children: [{ label: "Singapore (Q1)" }, { label: "Tokyo (Q3)" }] }] },
    datatable: { columns: ["Owner", "Task", "Deadline"], rows: [["Jenny", "Compliance Report", "Next Friday"], ["Sarah", "Budget Proposal", "Monday"]] },
    infographic: [{ heading: "Meeting Vitals", content: "4 Attendees, 3 Action Items, 1 Major Decision." }],
    slidedeck: [{ heading: "Q1 Strategy Update", content: "- APAC Expansion confirmed\n- Singapore launch prioritized\n- Budgeting in progress" }],
  },

  "study-guide": {
    description: "Transform textbook chapters and lecture notes into flashcards, quizzes, and structured study guides.",
    files: [
      {
        fileName: "Cognitive Psychology.pdf",
        content: `Human Memory Systems\n\nMemory is divided into sensory, short-term, and long-term stores. Working memory, a concept developed by Baddeley, includes the phonological loop and the visuospatial sketchpad. Long-term memory is split into explicit (declarative) and implicit (non-declarative). Declarative memory includes episodic (events) and semantic (facts). Implicit memory includes procedural skills and priming.`,
      },
    ],
    quiz: [
      { question: "Who developed the multi-component model of working memory?", options: ["Freud", "Skinner", "Baddeley", "Piaget"], correctIndex: 2, explanation: "Alan Baddeley is famous for his model of working memory involving specialized slave systems." },
    ],
    flashcards: [
      { front: "Episodic Memory", back: "Long-term memory for specific events and personal experiences." },
      { front: "Semantic Memory", back: "Long-term memory for general facts and knowledge about the world." },
    ],
    report: [{ heading: "Memory Systems", content: "This guide covers the fundamental structure of human memory, from short-term working processes to complex long-term storage." }],
    mindmap: { label: "Memory", children: [{ label: "Short Term" }, { label: "Long Term", children: [{ label: "Explicit" }, { label: "Implicit" }] }] },
    datatable: { columns: ["System", "Duration", "Capacity"], rows: [["Sensory", "2 sec", "Large"], ["Short-term", "30 sec", "7±2 items"], ["Long-term", "Indefinite", "Huge"]] },
    infographic: [{ heading: "The Memory Funnel", content: "How external stimuli become long-term knowledge." }],
    slidedeck: [{ heading: "Introduction to Memory", content: "- Multi-store model\n- Working memory components\n- Long-term distinctions" }],
  },

  "data-analysis": {
    description: "Understand statistical reports, extract data tables, and generate visual summaries of analytical findings.",
    files: [
      {
        fileName: "Financial Trends 2025.pdf",
        content: `Annual Financial Review\n\nRevenue grew by 8% to $145M. COGS increased 3% due to supply chain inflation. Net profit margin improved to 22%. R&D spend was $12M, focusing on AI automation. Customer acquisition cost (CAC) dropped to $45 while Lifetime Value (LTV) rose to $310, giving an LTV/CAC ratio of 6.8.`,
      },
    ],
    quiz: [
      { question: "What was the Net Profit Margin?", options: ["8%", "12%", "22%", "145%"], correctIndex: 2, explanation: "The report explicitly states a net profit margin improvement to 22%." },
    ],
    flashcards: [
      { front: "LTV/CAC", back: "Lifetime Value divided by Customer Acquisition Cost. A key metric for business health." },
    ],
    report: [{ heading: "Financial Performance", content: "The fiscal year 2025 showed strong growth with exceptional LTV/CAC ratios and improved margins." }],
    mindmap: { label: "Financials", children: [{ label: "Revenue ($145M)" }, { label: "Costs", children: [{ label: "COGS (+3%)" }, { label: "R&D ($12M)" }] }] },
    datatable: { columns: ["Metric", "Value", "Trend"], rows: [["Revenue", "$145M", "+8%"], ["Profit Margin", "22%", "Improving"]] },
    infographic: [{ heading: "2025 at a Glance", content: "$145M Revenue, 6.8x LTV/CAC." }],
    slidedeck: [{ heading: "2025 Financial Summary", content: "- Solid revenue growth\n- Margin expansion\n- High capital efficiency" }],
  },

  "legal-review": {
    description: "Analyze contracts and legal documents to identify key clauses, obligations, risks, and termination provisions.",
    files: [
      {
        fileName: "Master Service Agreement.pdf",
        content: `Standard MSA Terms\n\n1. Obligations: Vendor shall provide services as defined in Exhibit A. 2. Liability: Limited to 12 months of fees. 3. Termination: 30 days written notice. 4. IP: Work product belongs to Client upon payment. 5. Governing Law: State of Delaware.`,
      },
    ],
    quiz: [
      { question: "What is the liability cap in this MSA?", options: ["Unlimited", "12 months of fees", "$1 million", "6 months of fees"], correctIndex: 1, explanation: "Section 2 limits liability to the fees paid in the preceding 12 months." },
    ],
    flashcards: [
      { front: "Governing Law", back: "The jurisdiction whose laws will be used to interpret the contract (Delaware in this case)." },
    ],
    report: [{ heading: "Contract Risk Profile", content: "The agreement is standard, with favorable IP terms and a reasonable liability cap." }],
    mindmap: { label: "MSA Review", children: [{ label: "Finance", children: [{ label: "Liability Cap" }] }, { label: "Ops", children: [{ label: "Termination (30d)" }, { label: "Delaware Law" }] }] },
    datatable: { columns: ["Clause", "Summary", "Risk Level"], rows: [["Liability", "12mo Fees", "Low"], ["Termination", "30d Notice", "Medium"]] },
    infographic: [{ heading: "Legal Snapshot", content: "IP Transfers on Payment. Delaware Jurisdiction." }],
    slidedeck: [{ heading: "Contract Summary", content: "- Standard liability caps\n- IP protection included\n- 30-day exit clause" }],
  },

  "product-specs": {
    description: "Break down PRDs and feature specs to extract requirements, dependencies, and user stories for sprint planning.",
    files: [
      {
        fileName: "V1.2 Dashboard Spec.pdf",
        content: `V1.2 Dashboard Redesign PRD\n\nUser Goal: See all relevant data in one view. Requirements: 1. Sidebar navigation. 2. Real-time notifications. 3. Dark mode support. 4. Mobile responsiveness. Stakeholders: Design, Eng, Product. Timeline: 4 weeks.`,
      },
    ],
    quiz: [
      { question: "How many main requirements were listed?", options: ["2", "4", "6", "1"], correctIndex: 1, explanation: "The spec lists 4 requirements: sidebar, notifications, dark mode, and mobile responsiveness." },
    ],
    flashcards: [
      { front: "PRD", back: "Product Requirements Document. The source of truth for a feature's scope." },
    ],
    report: [{ heading: "Product Roadmap", content: "Focus for V1.2 is entirely on the dashboard UI and accessibility." }],
    mindmap: { label: "V1.2 Dashboard", children: [{ label: "UI", children: [{ label: "Sidebar" }, { label: "Dark Mode" }] }, { label: "UX", children: [{ label: "Notifications" }, { label: "Mobile" }] }] },
    datatable: { columns: ["Feature", "Status", "Priority"], rows: [["Dark Mode", "Ready", "High"], ["Sidebar", "In Dev", "High"]] },
    infographic: [{ heading: "Feature Scope", content: "4 Core Requirements. 4-week Sprint." }],
    slidedeck: [{ heading: "V1.2 Launch Plan", content: "- Revamped Navigation\n- Dark/Light Mode\n- Real-time alerts" }],
  },

  "literature-review": {
    description: "Synthesize findings across multiple academic papers to identify themes, gaps, and contradictions in the literature.",
    files: [
      {
        fileName: "Climate Change Education.pdf",
        content: `Literature Synthesis on CC Education\n\nRecent meta-analyses suggest that active learning methods significantly outperform traditional lectures in climate literacy (p < .01). However, Smith (2024) notes that curriculum integration remains fragmented. Gap identified: lack of longitudinal studies on behavioral change post-education.`,
      },
    ],
    quiz: [
      { question: "What is the primary gap identified in the literature?", options: ["Expensive books", "Lack of longitudinal behavioral studies", "Too many lectures", "No online courses"], correctIndex: 1, explanation: "The text explicitly highlights a lack of longitudinal studies on actual behavioral changes." },
    ],
    flashcards: [
      { front: "Meta-analysis", back: "A statistical technique that combines results from multiple studies to identify general trends." },
    ],
    report: [{ heading: "Current Landscape", content: "The field is moving towards active learning but lacks data on long-term impacts." }],
    mindmap: { label: "CC Education", children: [{ label: "Themes", children: [{ label: "Active Learning" }] }, { label: "Gaps", children: [{ label: "Longitudinal Data" }] }] },
    datatable: { columns: ["Author", "Theme", "Finding"], rows: [["Smith (2024)", "Integration", "Fragmented"], ["Meta-analysis", "Methods", "Active > Passive"]] },
    infographic: [{ heading: "Research Synthesis", content: "The shift to active learning is proven but fragmented." }],
    slidedeck: [{ heading: "Literature Summary", content: "- Active Learning is key\n- Implementation is messy\n- Long-term data needed" }],
  },
};

export function getFeaturedContent(slug: string): FeaturedStudioContent | null {
  return contentMap[slug] ?? null;
}
