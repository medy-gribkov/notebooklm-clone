// Pre-generated studio content for featured notebooks.
// This content is curated by the DocChat team and displayed in read-only mode.

export interface FeaturedStudioContent {
  quiz: { question: string; options: string[]; correctIndex: number; explanation: string }[];
  flashcards: { front: string; back: string }[];
  report: { heading: string; content: string }[];
  mindmap: { label: string; children?: { label: string; children?: { label: string }[] }[] };
}

const contentMap: Record<string, FeaturedStudioContent> = {
  "getting-started": {
    quiz: [
      {
        question: "What is the primary purpose of DocChat?",
        options: ["Social media management", "Chat with uploaded documents using AI", "Code generation", "Image editing"],
        correctIndex: 1,
        explanation: "DocChat lets you upload documents and ask questions about them using AI-powered RAG (Retrieval-Augmented Generation).",
      },
      {
        question: "Which file types does DocChat support?",
        options: ["Only PDF", "PDF and DOCX only", "PDF, DOCX, TXT, and images", "All file types"],
        correctIndex: 2,
        explanation: "DocChat supports PDF, DOCX, plain text, and image files (JPEG, PNG, WebP) with OCR capabilities.",
      },
      {
        question: "What is the Studio feature used for?",
        options: ["Editing documents", "Generating study materials from your documents", "Video conferencing", "File compression"],
        correctIndex: 1,
        explanation: "The Studio generates flashcards, quizzes, reports, mind maps, and more from your uploaded documents.",
      },
    ],
    flashcards: [
      { front: "What is RAG?", back: "Retrieval-Augmented Generation - a technique that retrieves relevant document chunks to provide context for AI responses." },
      { front: "How does DocChat ensure answer accuracy?", back: "It only answers from your uploaded documents, citing specific sources. It never uses outside knowledge." },
      { front: "What Studio tools are available?", back: "Flashcards, Quiz, Report, Mind Map, Data Table, Infographic, Slide Deck, and Audio Overview." },
      { front: "What is the maximum file size?", back: "PDF files up to 5MB, DOCX up to 10MB, text files up to 500KB, and images up to 5MB." },
    ],
    report: [
      { heading: "Overview", content: "DocChat is an AI-powered research assistant that lets you upload documents and have natural conversations about their content. It uses advanced RAG technology to provide accurate, cited answers." },
      { heading: "Key Features", content: "Upload multiple file types (PDF, DOCX, TXT, images), ask questions in natural language, get AI-generated study materials through the Studio, and organize your research into notebooks." },
      { heading: "Getting Started", content: "Create a new notebook, upload your documents in the Sources panel, wait for processing to complete, then start chatting. Use the Studio panel to generate flashcards, quizzes, and more." },
    ],
    mindmap: {
      label: "DocChat",
      children: [
        { label: "Upload", children: [{ label: "PDF" }, { label: "DOCX" }, { label: "TXT" }, { label: "Images" }] },
        { label: "Chat", children: [{ label: "Ask questions" }, { label: "Get cited answers" }, { label: "AI-powered" }] },
        { label: "Studio", children: [{ label: "Quiz" }, { label: "Flashcards" }, { label: "Report" }, { label: "Mind Map" }] },
      ],
    },
  },

  "research-analysis": {
    quiz: [
      {
        question: "What is the best approach for analyzing a research paper?",
        options: ["Read the conclusion only", "Skim the abstract", "Upload to DocChat and ask targeted questions", "Memorize the references"],
        correctIndex: 2,
        explanation: "DocChat can help you understand complex papers by answering specific questions with cited passages from the document.",
      },
      {
        question: "How can you compare findings across papers?",
        options: ["Create separate notebooks for each", "Upload all to one notebook and ask comparison questions", "Print them out", "Use a spreadsheet"],
        correctIndex: 1,
        explanation: "Uploading multiple papers to one notebook lets DocChat cross-reference findings when answering your questions.",
      },
    ],
    flashcards: [
      { front: "How to extract key findings?", back: "Ask DocChat: 'What are the main findings of this paper?' The AI will cite specific passages." },
      { front: "How to understand methodology?", back: "Ask: 'Explain the research methodology used in this study.' DocChat breaks down complex methods." },
      { front: "How to identify limitations?", back: "Ask: 'What limitations are mentioned in this research?' The AI highlights acknowledged gaps." },
    ],
    report: [
      { heading: "Research Workflow", content: "Upload your research papers to DocChat notebooks. The AI indexes the content for semantic search, allowing you to ask detailed questions and get cited answers from the source material." },
      { heading: "Analysis Techniques", content: "Use targeted questions to extract methodology, findings, limitations, and implications. The Studio can generate structured reports and data tables from your research." },
    ],
    mindmap: {
      label: "Research Analysis",
      children: [
        { label: "Upload Papers", children: [{ label: "PDF format" }, { label: "Multiple files" }] },
        { label: "Ask Questions", children: [{ label: "Methodology" }, { label: "Findings" }, { label: "Limitations" }] },
        { label: "Generate", children: [{ label: "Summary report" }, { label: "Data tables" }, { label: "Comparisons" }] },
      ],
    },
  },

  "meeting-organizer": {
    quiz: [
      {
        question: "What is the most effective way to process meeting notes?",
        options: ["Manually summarize", "Upload to DocChat for AI-powered analysis", "Delete them", "Forward to everyone"],
        correctIndex: 1,
        explanation: "DocChat can analyze meeting notes to extract action items, decisions, and key discussion points.",
      },
    ],
    flashcards: [
      { front: "How to extract action items?", back: "Ask DocChat: 'List all action items from these meeting notes with assigned owners and deadlines.'" },
      { front: "How to summarize meetings?", back: "Use Studio's Report feature to auto-generate a structured summary of your meeting documents." },
      { front: "How to track decisions?", back: "Ask: 'What decisions were made in this meeting?' DocChat identifies and cites each decision." },
    ],
    report: [
      { heading: "Meeting Notes Workflow", content: "Upload meeting notes, transcripts, or agendas to DocChat. The AI helps you extract action items, summarize discussions, and track decisions across multiple meetings." },
      { heading: "Best Practices", content: "Upload notes promptly after meetings. Use the Studio to generate flashcards of key decisions. Create separate notebooks for different project meetings." },
    ],
    mindmap: {
      label: "Meeting Organizer",
      children: [
        { label: "Input", children: [{ label: "Notes" }, { label: "Transcripts" }, { label: "Agendas" }] },
        { label: "Extract", children: [{ label: "Action items" }, { label: "Decisions" }, { label: "Key points" }] },
        { label: "Output", children: [{ label: "Summaries" }, { label: "Follow-ups" }, { label: "Reports" }] },
      ],
    },
  },

  "study-guide": {
    quiz: [
      {
        question: "How can DocChat help with exam preparation?",
        options: ["It takes exams for you", "It generates study materials from your textbooks", "It schedules study time", "It contacts professors"],
        correctIndex: 1,
        explanation: "Upload your textbook chapters and DocChat's Studio generates quizzes, flashcards, and summaries to help you study.",
      },
      {
        question: "What is the most effective study material to generate?",
        options: ["Only summaries", "A combination of flashcards, quizzes, and mind maps", "Only flashcards", "Only practice tests"],
        correctIndex: 1,
        explanation: "Using multiple study formats (active recall with flashcards, testing with quizzes, visual organization with mind maps) improves retention.",
      },
    ],
    flashcards: [
      { front: "Active Recall", back: "A study technique where you actively retrieve information from memory. DocChat flashcards facilitate this." },
      { front: "Spaced Repetition", back: "Reviewing material at increasing intervals. Use DocChat-generated flashcards regularly for best results." },
      { front: "Mind Mapping", back: "Visual organization of concepts. DocChat's mind map feature creates hierarchical visualizations from your study material." },
    ],
    report: [
      { heading: "Study Guide Creation", content: "Upload your textbook chapters, lecture notes, or study materials. DocChat indexes the content and makes it searchable through natural language queries." },
      { heading: "Active Learning", content: "Use the Studio to generate quizzes for self-testing, flashcards for active recall, and mind maps for visual organization of concepts." },
      { heading: "Exam Preparation", content: "Ask DocChat specific questions about the material. Use the quiz feature to test your understanding. Review flashcards regularly using spaced repetition." },
    ],
    mindmap: {
      label: "Study Guide",
      children: [
        { label: "Upload", children: [{ label: "Textbooks" }, { label: "Lecture notes" }, { label: "Articles" }] },
        { label: "Study", children: [{ label: "Flashcards" }, { label: "Quizzes" }, { label: "Summaries" }] },
        { label: "Review", children: [{ label: "Mind maps" }, { label: "Reports" }, { label: "Practice" }] },
      ],
    },
  },

  "data-analysis": {
    quiz: [
      {
        question: "How can DocChat help with data analysis documents?",
        options: ["It runs statistical tests", "It helps you understand and question data reports", "It creates databases", "It visualizes real-time data"],
        correctIndex: 1,
        explanation: "Upload data reports and analysis documents, then ask DocChat to explain findings, methodology, and implications.",
      },
    ],
    flashcards: [
      { front: "How to understand statistics in reports?", back: "Ask DocChat to explain specific statistical findings in plain language. It cites the exact passages." },
      { front: "How to extract data tables?", back: "Use Studio's Data Table feature to automatically extract and structure tabular data from your documents." },
      { front: "How to create visual summaries?", back: "Use Studio's Infographic feature to generate visual summaries of key statistics and findings." },
    ],
    report: [
      { heading: "Data Analysis Workflow", content: "Upload research data reports, statistical analyses, or data documentation to DocChat. The AI helps you understand complex findings and extract structured information." },
      { heading: "Tools", content: "Use Data Table generation to structure findings, Infographic for visual summaries, and Reports for comprehensive overviews of the data analysis." },
    ],
    mindmap: {
      label: "Data Analysis",
      children: [
        { label: "Upload", children: [{ label: "Reports" }, { label: "Datasets docs" }, { label: "Analysis files" }] },
        { label: "Explore", children: [{ label: "Statistics" }, { label: "Trends" }, { label: "Methodology" }] },
        { label: "Generate", children: [{ label: "Data tables" }, { label: "Infographics" }, { label: "Reports" }] },
      ],
    },
  },

  "legal-review": {
    quiz: [
      {
        question: "What is the best way to analyze a contract with DocChat?",
        options: ["Read the entire contract manually", "Upload and ask targeted questions about specific clauses", "Only read the signature page", "Use a search engine"],
        correctIndex: 1,
        explanation: "DocChat can analyze contracts by answering questions about specific clauses, obligations, and terms with cited references.",
      },
      {
        question: "How can you identify risks in a legal document?",
        options: ["Look for bold text", "Ask DocChat to identify liability clauses and obligations", "Count the pages", "Check the font size"],
        correctIndex: 1,
        explanation: "Ask targeted questions about liability, indemnification, termination clauses, and obligations to identify potential risks.",
      },
    ],
    flashcards: [
      { front: "How to extract key obligations?", back: "Ask DocChat: 'List all obligations and responsibilities defined in this contract for each party.'" },
      { front: "How to find termination clauses?", back: "Ask: 'What are the termination conditions and notice periods in this agreement?'" },
      { front: "How to compare contract versions?", back: "Upload both versions to the same notebook and ask: 'What are the differences between these two documents?'" },
    ],
    report: [
      { heading: "Contract Analysis", content: "Upload contracts, agreements, or legal documents to DocChat. The AI helps identify key clauses, obligations, and potential areas of concern." },
      { heading: "Risk Assessment", content: "Ask about liability limits, indemnification, force majeure, and termination provisions. DocChat cites exact clauses from the document." },
    ],
    mindmap: {
      label: "Legal Review",
      children: [
        { label: "Upload", children: [{ label: "Contracts" }, { label: "Agreements" }, { label: "Policies" }] },
        { label: "Analyze", children: [{ label: "Obligations" }, { label: "Risks" }, { label: "Clauses" }] },
        { label: "Output", children: [{ label: "Summary" }, { label: "Key terms" }, { label: "Action items" }] },
      ],
    },
  },

  "product-specs": {
    quiz: [
      {
        question: "How can DocChat help with product requirements?",
        options: ["It writes code", "It helps analyze and question PRD content", "It designs UI", "It runs tests"],
        correctIndex: 1,
        explanation: "Upload PRDs and specs to DocChat, then ask questions about features, requirements, acceptance criteria, and priorities.",
      },
    ],
    flashcards: [
      { front: "How to extract feature requirements?", back: "Ask DocChat: 'List all features described in this PRD with their acceptance criteria.'" },
      { front: "How to identify dependencies?", back: "Ask: 'What dependencies and prerequisites are mentioned for each feature?'" },
      { front: "How to summarize priorities?", back: "Ask: 'What are the P0 and P1 features in this document?' DocChat cites the prioritization." },
    ],
    report: [
      { heading: "PRD Analysis", content: "Upload product requirement documents, feature specs, or technical designs. DocChat indexes the content for detailed querying." },
      { heading: "Feature Extraction", content: "Use targeted questions to extract features, acceptance criteria, user stories, and technical requirements from your specs." },
    ],
    mindmap: {
      label: "Product Specs",
      children: [
        { label: "Input", children: [{ label: "PRDs" }, { label: "Feature specs" }, { label: "Tech designs" }] },
        { label: "Analyze", children: [{ label: "Features" }, { label: "Dependencies" }, { label: "Priorities" }] },
        { label: "Output", children: [{ label: "Requirements" }, { label: "User stories" }, { label: "Summaries" }] },
      ],
    },
  },

  "literature-review": {
    quiz: [
      {
        question: "What is the most effective way to synthesize multiple papers?",
        options: ["Read abstracts only", "Upload all papers to one notebook and ask comparison questions", "Read one paper at a time", "Only look at citations"],
        correctIndex: 1,
        explanation: "Uploading multiple papers to one notebook lets DocChat cross-reference findings, methodologies, and conclusions.",
      },
      {
        question: "How can DocChat help identify research gaps?",
        options: ["It cannot", "Ask about limitations and future work mentioned across papers", "It generates new hypotheses", "It contacts researchers"],
        correctIndex: 1,
        explanation: "Ask DocChat to summarize limitations and suggested future work from each paper to identify gaps in the research.",
      },
    ],
    flashcards: [
      { front: "How to compare methodologies?", back: "Ask DocChat: 'Compare the research methodologies used across these papers. What are the similarities and differences?'" },
      { front: "How to find common themes?", back: "Ask: 'What themes or findings appear across multiple papers in this collection?'" },
      { front: "How to build a literature matrix?", back: "Use Studio's Data Table to extract author, year, methodology, and findings from each paper into a structured table." },
    ],
    report: [
      { heading: "Literature Synthesis", content: "Upload multiple academic papers to a single notebook. DocChat can cross-reference content to help you identify patterns, contradictions, and gaps in the literature." },
      { heading: "Citation Tracking", content: "Ask about specific claims or findings and DocChat identifies which papers support or contradict them, with direct citations." },
      { heading: "Research Gaps", content: "Query limitations and future work sections across papers to identify unexplored areas and potential research directions." },
    ],
    mindmap: {
      label: "Literature Review",
      children: [
        { label: "Collect", children: [{ label: "Papers" }, { label: "Theses" }, { label: "Reviews" }] },
        { label: "Synthesize", children: [{ label: "Themes" }, { label: "Methods" }, { label: "Findings" }] },
        { label: "Identify", children: [{ label: "Gaps" }, { label: "Trends" }, { label: "Contradictions" }] },
      ],
    },
  },
};

export function getFeaturedContent(slug: string): FeaturedStudioContent | null {
  return contentMap[slug] ?? null;
}
