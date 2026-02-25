// Pre-generated studio content for featured company notebooks.

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
  wix: {
    description: "AI-generated analysis of Wix, the leading cloud-based website builder and web development platform.",
    files: [
      {
        fileName: "Wix Company Profile.pdf",
        content: `## Wix - Company Overview\n\nWix.com Ltd. is a leading cloud-based web development platform serving over 250 million users in 190 countries. Founded in 2006 by Avishai Abrahami, Nadav Abrahami, and Giora Kaplan, the company is headquartered in Tel Aviv, Israel, and publicly traded on NASDAQ (WIX).\n\n## Products & Services\n\nWix offers an intuitive drag-and-drop website builder, Wix Studio for agencies and freelancers, Wix Editor X for advanced responsive design, and a comprehensive suite of business solutions including e-commerce, booking, restaurants, and events. The platform supports over 800 customizable templates and integrates with hundreds of third-party applications.\n\n## Technology & Engineering\n\nWix operates one of Israel's largest engineering organizations with over 3,000 engineers. The tech stack includes React, Node.js, Scala, and Kotlin. Wix heavily invests in AI, having launched Wix ADI (Artificial Design Intelligence) for automated website creation. The company contributes to open-source projects and runs an active engineering blog.\n\n## Market Position\n\nWix competes with Squarespace, Shopify, WordPress.com, and Webflow. With $1.7B+ in annual revenue, Wix leads in SMB website building with a freemium model converting to premium subscriptions. Their unique value lies in combining website building with comprehensive business management tools.\n\n## Culture & Careers\n\nWix is known for its vibrant startup culture despite being a large public company. Offices across Tel Aviv, Be'er Sheva, Kyiv, Vilnius, and other cities. They offer flexible work policies, professional development, and a strong internal mobility program. Engineering roles span full-stack, DevOps, data science, and AI/ML.`,
      },
    ],
    quiz: [
      { question: "When was Wix founded?", options: ["2004", "2006", "2008", "2010"], correctIndex: 1, explanation: "Wix was founded in 2006 by Avishai Abrahami, Nadav Abrahami, and Giora Kaplan." },
    ],
    flashcards: [{ front: "Wix ADI", back: "Artificial Design Intelligence - Wix's AI-powered tool that automatically creates websites based on user preferences." }],
    report: [{ heading: "Company Summary", content: "Wix is a $1.7B+ revenue cloud platform serving 250M+ users with website building and business management tools." }],
    mindmap: { label: "Wix", children: [{ label: "Products", children: [{ label: "Website Builder" }, { label: "Wix Studio" }] }, { label: "Tech", children: [{ label: "React" }, { label: "Node.js" }] }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Users", "250M+"], ["Revenue", "$1.7B+"], ["Engineers", "3,000+"], ["Founded", "2006"]] },
    infographic: [{ heading: "Wix at a Glance", content: "250M+ users across 190 countries, NASDAQ listed, 3,000+ engineers." }],
    slidedeck: [{ heading: "Wix Overview", content: "- Leading website builder platform\n- 250M+ users, $1.7B+ revenue\n- Heavy AI investment (Wix ADI)\n- 3,000+ engineers in Tel Aviv and globally" }],
  },
  "monday-com": {
    description: "AI-generated analysis of monday.com, the work operating system for project and workflow management.",
    files: [{ fileName: "monday.com Company Profile.pdf", content: `## monday.com - Company Overview\n\nmonday.com is a cloud-based Work OS that enables organizations to build custom work management tools and run projects, processes, and everyday work. Founded in 2012 by Roy Mann and Eran Zinman, the company is headquartered in Tel Aviv and trades on NASDAQ (MNDY).\n\n## Products & Services\n\nThe platform offers monday work management, monday sales CRM, monday dev for product development, and monday service for customer support. Features include customizable boards, automations, integrations with 200+ tools, dashboards, and Gantt charts.\n\n## Technology & Engineering\n\nThe engineering team uses React, Ruby on Rails, and a microservices architecture. monday.com has invested heavily in AI capabilities, introducing monday AI for automation suggestions, content generation, and formula building. The platform processes billions of data points daily.\n\n## Market & Culture\n\nWith $730M+ in annual revenue and 225,000+ customers, monday.com competes with Asana, Jira, ClickUp, and Notion. Known for its colorful branding and user-friendly approach, the company maintains a strong engineering culture with offices in Tel Aviv, New York, London, and other cities.` }],
    quiz: [{ question: "Who founded monday.com?", options: ["Roy Mann & Eran Zinman", "Avishai Abrahami", "Amit Gilon", "Dedi Gilad"], correctIndex: 0, explanation: "monday.com was founded in 2012 by Roy Mann and Eran Zinman." }],
    flashcards: [{ front: "Work OS", back: "monday.com's term for their flexible platform that allows organizations to shape workflows to fit their needs." }],
    report: [{ heading: "Summary", content: "monday.com is a $730M+ revenue Work OS platform serving 225,000+ customers globally." }],
    mindmap: { label: "monday.com", children: [{ label: "Products", children: [{ label: "Work Management" }, { label: "CRM" }, { label: "Dev" }] }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Revenue", "$730M+"], ["Customers", "225,000+"], ["Founded", "2012"]] },
    infographic: [{ heading: "monday.com", content: "225,000+ customers, Work OS powering millions of workflows." }],
    slidedeck: [{ heading: "monday.com", content: "- Work OS platform\n- $730M+ revenue\n- React + Ruby on Rails\n- AI-powered automations" }],
  },
  jfrog: {
    description: "AI-generated analysis of JFrog, the universal software supply chain platform.",
    files: [{ fileName: "JFrog Company Profile.pdf", content: `## JFrog - Company Overview\n\nJFrog Ltd. is a technology company providing a universal software supply chain platform. Founded in 2008 by Shlomi Ben Haim, Yoav Landman, and Fred Simon, JFrog is headquartered in Netanya, Israel, and trades on NASDAQ (FROG). The company has pioneered the concept of liquid software, enabling software updates to flow seamlessly and securely from developers to devices.\n\n## Products & Services\n\nJFrog Artifactory is the world's most widely used binary repository manager. The JFrog Platform also includes Xray (security scanning), Pipelines (CI/CD), Distribution (release management), and Connect (IoT). Their DevOps, Security, and MLOps solutions serve over 7,000 customers.\n\n## Technology & Engineering\n\nJFrog's platform is built on Java, Go, and React. The company supports every major package format (Docker, Maven, npm, PyPI, etc.) and integrates with all major CI/CD tools. Their ML Model Management capabilities extend DevOps practices to machine learning workflows.` }],
    quiz: [{ question: "What is JFrog Artifactory?", options: ["A CI/CD tool", "A binary repository manager", "A cloud provider", "A database"], correctIndex: 1, explanation: "JFrog Artifactory is the world's most widely used binary repository manager." }],
    flashcards: [{ front: "Liquid Software", back: "JFrog's vision of software updates flowing seamlessly and securely from developers to production." }],
    report: [{ heading: "Summary", content: "JFrog provides the universal software supply chain platform serving 7,000+ enterprise customers." }],
    mindmap: { label: "JFrog", children: [{ label: "Artifactory" }, { label: "Xray" }, { label: "Pipelines" }] },
    datatable: { columns: ["Product", "Function"], rows: [["Artifactory", "Binary repo"], ["Xray", "Security"], ["Pipelines", "CI/CD"]] },
    infographic: [{ heading: "JFrog", content: "7,000+ customers, universal DevOps platform." }],
    slidedeck: [{ heading: "JFrog", content: "- Universal software supply chain\n- Artifactory + Xray + Pipelines\n- Java, Go, React stack\n- 7,000+ customers" }],
  },
  gong: {
    description: "AI-generated analysis of Gong, the revenue intelligence platform.",
    files: [{ fileName: "Gong Company Profile.pdf", content: `## Gong - Company Overview\n\nGong.io is a revenue intelligence platform that uses AI to capture and analyze customer interactions across calls, emails, and meetings. Founded in 2015 by Amit Bendov and Eilon Reshef, Gong is headquartered in Tel Aviv with US offices in San Francisco. Valued at $7.25 billion, Gong serves over 4,000 customers.\n\n## Products & Services\n\nGong's platform automatically records, transcribes, and analyzes customer-facing interactions. It provides deal intelligence, people intelligence, and market intelligence. Features include conversation analytics, coaching insights, deal forecasting, and pipeline management. The platform integrates with major CRMs like Salesforce and HubSpot.\n\n## Technology & Engineering\n\nGong's AI processes millions of customer interactions using NLP, speech recognition, and machine learning. The engineering team works with Python, TypeScript, React, and cloud-native architectures. Gong's proprietary AI models are trained on billions of data points from real business conversations.` }],
    quiz: [{ question: "What does Gong analyze?", options: ["Code", "Customer interactions", "Financial data", "HR records"], correctIndex: 1, explanation: "Gong analyzes customer-facing interactions across calls, emails, and meetings." }],
    flashcards: [{ front: "Revenue Intelligence", back: "AI-driven analysis of customer interactions to provide insights for sales teams." }],
    report: [{ heading: "Summary", content: "Gong is a $7.25B valued revenue intelligence platform serving 4,000+ customers." }],
    mindmap: { label: "Gong", children: [{ label: "Deal Intelligence" }, { label: "People Intelligence" }, { label: "Market Intelligence" }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Valuation", "$7.25B"], ["Customers", "4,000+"], ["Founded", "2015"]] },
    infographic: [{ heading: "Gong", content: "$7.25B valuation, AI-powered revenue intelligence for 4,000+ customers." }],
    slidedeck: [{ heading: "Gong", content: "- Revenue intelligence platform\n- $7.25B valuation\n- Python + TypeScript + React\n- NLP + speech recognition" }],
  },
  "check-point": {
    description: "AI-generated analysis of Check Point Software Technologies, a cybersecurity leader.",
    files: [{ fileName: "Check Point Company Profile.pdf", content: `## Check Point - Company Overview\n\nCheck Point Software Technologies Ltd. is a leading provider of cybersecurity solutions. Founded in 1993 by Gil Shwed, Marius Nacht, and Shlomo Kramer, the company is headquartered in Tel Aviv and Ramat Gan. Traded on NASDAQ (CHKP), Check Point pioneered the firewall industry and now provides comprehensive cyber threat prevention solutions.\n\n## Products & Services\n\nCheck Point offers Infinity architecture for consolidated security across networks, cloud, mobile, and IoT. Products include CloudGuard (cloud security), Harmony (workspace security), Quantum (network security), and ThreatCloud AI (the brain behind all Check Point products, powered by AI).\n\n## Technology & Engineering\n\nCheck Point's engineering spans C/C++, Python, Java, and React. The R&D center in Tel Aviv is one of Israel's largest, with thousands of engineers. ThreatCloud AI processes billions of cyber events daily using machine learning models to identify and prevent zero-day attacks.` }],
    quiz: [{ question: "What did Check Point pioneer?", options: ["Cloud computing", "The firewall industry", "Social media", "E-commerce"], correctIndex: 1, explanation: "Check Point pioneered the firewall industry, founded in 1993." }],
    flashcards: [{ front: "ThreatCloud AI", back: "Check Point's AI-powered threat intelligence engine that processes billions of cyber events daily." }],
    report: [{ heading: "Summary", content: "Check Point is a NASDAQ-listed cybersecurity pioneer protecting enterprises worldwide since 1993." }],
    mindmap: { label: "Check Point", children: [{ label: "CloudGuard" }, { label: "Harmony" }, { label: "Quantum" }, { label: "ThreatCloud AI" }] },
    datatable: { columns: ["Product", "Focus"], rows: [["CloudGuard", "Cloud"], ["Harmony", "Workspace"], ["Quantum", "Network"]] },
    infographic: [{ heading: "Check Point", content: "30+ years in cybersecurity, protecting millions of organizations worldwide." }],
    slidedeck: [{ heading: "Check Point", content: "- Cybersecurity pioneer (1993)\n- Infinity consolidated architecture\n- ThreatCloud AI\n- C/C++, Python, Java, React" }],
  },
  tabnine: {
    description: "AI-generated analysis of Tabnine, the AI code assistant platform.",
    files: [{ fileName: "Tabnine Company Profile.pdf", content: `## Tabnine - Company Overview\n\nTabnine is an AI-powered code assistant that helps developers write code faster through intelligent code completions, chat, and code generation. Founded in 2013 (originally Codota) by Dror Weiss and Eran Yahav, Tabnine is headquartered in Tel Aviv. The company serves over 1 million developers and is known for its privacy-first approach to AI coding.\n\n## Products & Services\n\nTabnine offers code completions, AI chat, code generation, test generation, and code review. It supports 30+ programming languages and integrates with all major IDEs (VS Code, IntelliJ, Neovim, etc.). Tabnine Enterprise allows organizations to train models on their own codebase while keeping code private.\n\n## Technology & Engineering\n\nTabnine was one of the first companies to apply deep learning to code completion. They use transformer-based language models trained on permissively licensed open-source code. The platform runs models both locally (for privacy) and in the cloud. Their engineering team works with Python, TypeScript, and Rust.` }],
    quiz: [{ question: "What makes Tabnine unique?", options: ["Free pricing", "Privacy-first AI coding", "Only supports Python", "Game development"], correctIndex: 1, explanation: "Tabnine is known for its privacy-first approach, allowing organizations to keep their code private." }],
    flashcards: [{ front: "Tabnine Enterprise", back: "Tabnine's enterprise offering that trains AI models on an organization's own codebase while maintaining code privacy." }],
    report: [{ heading: "Summary", content: "Tabnine serves 1M+ developers with privacy-first AI code assistance across 30+ languages." }],
    mindmap: { label: "Tabnine", children: [{ label: "Completions" }, { label: "Chat" }, { label: "Code Gen" }, { label: "Enterprise" }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Developers", "1M+"], ["Languages", "30+"], ["Founded", "2013"]] },
    infographic: [{ heading: "Tabnine", content: "1M+ developers, privacy-first AI coding assistant." }],
    slidedeck: [{ heading: "Tabnine", content: "- AI code assistant (privacy-first)\n- 1M+ developers\n- Python, TypeScript, Rust\n- Local + cloud model execution" }],
  },
  snyk: {
    description: "AI-generated analysis of Snyk, the developer-first security platform.",
    files: [{ fileName: "Snyk Company Profile.pdf", content: `## Snyk - Company Overview\n\nSnyk is a developer-first security platform that helps software development teams find and fix vulnerabilities in their code, dependencies, containers, and infrastructure as code. Founded in 2015 by Guy Podjarny, Assaf Hefetz, and Danny Grander, Snyk is headquartered in Boston with a major R&D center in Tel Aviv.\n\n## Products & Services\n\nSnyk offers Snyk Code (SAST), Snyk Open Source (SCA), Snyk Container (container security), Snyk IaC (infrastructure as code security), and Snyk Cloud. The platform integrates directly into developer workflows via IDE plugins, CI/CD pipelines, and SCM integrations.\n\n## Technology & Engineering\n\nSnyk's platform is built with TypeScript, Node.js, Go, and React. Their security intelligence is powered by a proprietary vulnerability database curated by Snyk's security research team. The company processes millions of projects and has fixed over 100 million vulnerabilities.` }],
    quiz: [{ question: "What does SAST stand for?", options: ["Simple App Security Test", "Static Application Security Testing", "Snyk App Scanning Tool", "Software Analysis System"], correctIndex: 1, explanation: "SAST stands for Static Application Security Testing, which Snyk provides via Snyk Code." }],
    flashcards: [{ front: "Snyk Code", back: "Snyk's Static Application Security Testing (SAST) tool that finds and fixes vulnerabilities in proprietary code." }],
    report: [{ heading: "Summary", content: "Snyk is a developer-first security platform that has fixed 100M+ vulnerabilities across millions of projects." }],
    mindmap: { label: "Snyk", children: [{ label: "Code (SAST)" }, { label: "Open Source (SCA)" }, { label: "Container" }, { label: "IaC" }] },
    datatable: { columns: ["Product", "Type"], rows: [["Snyk Code", "SAST"], ["Snyk Open Source", "SCA"], ["Snyk Container", "Container"], ["Snyk IaC", "IaC"]] },
    infographic: [{ heading: "Snyk", content: "100M+ vulnerabilities fixed, developer-first security." }],
    slidedeck: [{ heading: "Snyk", content: "- Developer-first security\n- TypeScript, Node.js, Go, React\n- 100M+ vulnerabilities fixed\n- IDE + CI/CD + SCM integrations" }],
  },
  appsflyer: {
    description: "AI-generated analysis of AppsFlyer, the mobile attribution and marketing analytics platform.",
    files: [{ fileName: "AppsFlyer Company Profile.pdf", content: `## AppsFlyer - Company Overview\n\nAppsFlyer is a mobile attribution and marketing analytics platform that helps brands measure and optimize their marketing campaigns. Founded in 2011 by Oren Kaniel and Reshef Mann, AppsFlyer is headquartered in Herzliya, Israel, with offices worldwide. The platform is trusted by 12,000+ brands and processes billions of mobile events daily.\n\n## Products & Services\n\nAppsFlyer provides mobile attribution, deep linking (OneLink), audience segmentation, ROI measurement, fraud protection (Protect360), and privacy-preserving analytics. The platform supports iOS, Android, CTV, PC, and console attribution with integrations across 10,000+ media partners.\n\n## Technology & Engineering\n\nAppsFlyer processes over 100 billion API calls daily using a scalable architecture built on Java, Scala, Python, and React. Their data pipeline handles massive volumes in real-time using Kafka, Druid, and custom-built solutions. The engineering team of 500+ focuses on big data, machine learning, and privacy technologies.` }],
    quiz: [{ question: "How many API calls does AppsFlyer process daily?", options: ["1 billion", "10 billion", "100 billion", "1 trillion"], correctIndex: 2, explanation: "AppsFlyer processes over 100 billion API calls daily." }],
    flashcards: [{ front: "Mobile Attribution", back: "The process of identifying which marketing campaign or channel led a user to install and engage with a mobile app." }],
    report: [{ heading: "Summary", content: "AppsFlyer is the leading mobile attribution platform trusted by 12,000+ brands, processing 100B+ events daily." }],
    mindmap: { label: "AppsFlyer", children: [{ label: "Attribution" }, { label: "Deep Linking" }, { label: "Fraud Protection" }, { label: "Analytics" }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Brands", "12,000+"], ["API calls/day", "100B+"], ["Engineers", "500+"], ["Founded", "2011"]] },
    infographic: [{ heading: "AppsFlyer", content: "12,000+ brands, 100B+ daily API calls, 10,000+ media partner integrations." }],
    slidedeck: [{ heading: "AppsFlyer", content: "- Mobile attribution leader\n- 12,000+ brands\n- Java, Scala, Python, React\n- 100B+ daily API calls" }],
  },
};

export function getFeaturedContent(slug: string): FeaturedStudioContent | null {
  return contentMap[slug] ?? null;
}
