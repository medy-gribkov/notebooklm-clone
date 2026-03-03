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
        content: `## Wix - Company Overview

Wix.com Ltd. is a leading cloud-based web development platform serving over 250 million users in 190 countries. Founded in 2006 by Avishai Abrahami, Nadav Abrahami, and Giora Kaplan, the company is headquartered in Tel Aviv, Israel, and publicly traded on NASDAQ (WIX). The company went public in November 2013 at a valuation of approximately $700 million and has since grown to a multi-billion dollar enterprise. Wix operates as both a website builder and a complete business operating system for small and medium businesses.

## Products & Services

Wix offers an intuitive drag-and-drop website builder that enables users to create professional websites without coding knowledge. Key products include:

- **Wix Editor**: The flagship drag-and-drop website builder with pixel-perfect design control and 800+ customizable templates covering every industry from restaurants and photography to e-commerce and portfolios.
- **Wix Studio**: A professional platform designed specifically for agencies and freelancers, offering advanced design tools, client management features, and custom billing solutions.
- **Wix eCommerce**: A full-featured online store solution with inventory management, payment processing, shipping integration, and multi-channel selling capabilities across Amazon, eBay, Facebook, and Instagram.
- **Wix Bookings**: An appointment scheduling system for service-based businesses, supporting group sessions, courses, memberships, and automated reminders.
- **Wix Restaurants**: A dedicated solution for food businesses with online ordering, table reservations, and menu management.
- **Wix Events**: Event management tools for ticketing, RSVPs, and event promotion.
- **Velo by Wix**: A full-stack development platform for building advanced web applications with serverless computing, databases, and APIs built on top of the Wix ecosystem.

The platform follows a freemium model where users can create websites for free with Wix branding, then upgrade to premium plans ranging from $17/month (Light) to $159/month (Business Elite) for features like custom domains, increased storage, analytics, and e-commerce capabilities.

## Technology & Engineering

Wix operates one of Israel's largest engineering organizations with over 3,000 engineers across multiple R&D centers. The technology stack includes:

- **Frontend**: React, custom micro-frontend architecture (Thunderbolt rendering engine)
- **Backend**: Node.js, Scala, Kotlin, Java microservices
- **Infrastructure**: Kubernetes, Docker, Google Cloud Platform
- **Data**: Apache Kafka, Elasticsearch, custom ML pipelines
- **Mobile**: React Native for cross-platform mobile apps

Wix heavily invests in artificial intelligence. Wix ADI (Artificial Design Intelligence) was one of the first AI-powered website creation tools, automatically generating complete websites based on user answers to simple questions. More recently, Wix has integrated generative AI throughout the platform for content creation, image generation, SEO optimization, and business text writing. The company maintains an active engineering blog at wix-engineering.com and contributes to open-source projects including the Wix Style Processor, detox (React Native testing), and react-native-navigation.

## Market Position & Financials

Wix competes primarily with Squarespace, Shopify, WordPress.com, Webflow, and GoDaddy Website Builder. With $1.7B+ in annual revenue (2024), Wix leads the SMB website building market. The company has achieved profitability with positive free cash flow exceeding $300 million annually. Key competitive advantages include the breadth of built-in business tools (no need for third-party plugins for most use cases), the AI-powered design engine, and the massive template library.

The company serves several distinct market segments: individual creators and bloggers, small business owners, e-commerce merchants, agencies building sites for clients, and enterprise organizations through Wix Studio. Approximately 60% of revenue comes from North America, with Europe accounting for about 25% and the rest from other regions.

## Company Culture & Careers

Wix is known for its vibrant startup culture despite being a large public company with over 5,000 employees. The company operates major offices in Tel Aviv (HQ), Be'er Sheva, Kyiv, Vilnius, Miami, New York, San Francisco, Sao Paulo, and Tokyo. Wix offers flexible work policies with hybrid and remote options, professional development budgets, and a strong internal mobility program that encourages employees to move between teams and roles.

Engineering roles at Wix span full-stack development, frontend architecture, backend services, DevOps/SRE, data science, machine learning, mobile development, and QA automation. The company is known for investing in junior developers through its Wix Enter program, which provides intensive training for career changers entering the tech industry. Interview processes typically include coding challenges, system design discussions, and cultural fit conversations focused on collaboration and ownership.`,
      },
    ],
    quiz: [
      { question: "When was Wix founded?", options: ["2004", "2006", "2008", "2010"], correctIndex: 1, explanation: "Wix was founded in 2006 by Avishai Abrahami, Nadav Abrahami, and Giora Kaplan." },
      { question: "How many users does Wix serve?", options: ["50 million", "100 million", "250 million", "500 million"], correctIndex: 2, explanation: "Wix serves over 250 million users across 190 countries." },
      { question: "What is Wix ADI?", options: ["A code editor", "An AI website builder", "A hosting service", "A CMS plugin"], correctIndex: 1, explanation: "Wix ADI (Artificial Design Intelligence) automatically generates complete websites based on user input." },
    ],
    flashcards: [
      { front: "Wix ADI", back: "Artificial Design Intelligence - Wix's AI-powered tool that automatically creates websites based on user preferences and answers to simple questions." },
      { front: "Velo by Wix", back: "A full-stack development platform for building advanced web applications with serverless computing, databases, and APIs on top of the Wix ecosystem." },
      { front: "Wix Revenue Model", back: "Freemium model: free websites with Wix branding, premium plans from $17/month to $159/month for custom domains, storage, analytics, and e-commerce." },
    ],
    report: [
      { heading: "Company Summary", content: "Wix is a $1.7B+ revenue cloud platform serving 250M+ users with website building and business management tools. Founded 2006, NASDAQ listed, 5,000+ employees." },
      { heading: "Technology", content: "React frontend, Node.js/Scala/Kotlin backend, 3,000+ engineers. Pioneered AI website creation with Wix ADI. Active open-source contributor." },
      { heading: "Market Position", content: "Leads SMB website building market. Competes with Squarespace, Shopify, WordPress.com. 60% revenue from North America. Positive free cash flow exceeding $300M." },
    ],
    mindmap: { label: "Wix", children: [{ label: "Products", children: [{ label: "Website Builder" }, { label: "Wix Studio" }, { label: "eCommerce" }, { label: "Velo" }] }, { label: "Tech", children: [{ label: "React" }, { label: "Node.js" }, { label: "Scala/Kotlin" }] }, { label: "AI", children: [{ label: "Wix ADI" }, { label: "Content Gen" }] }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Users", "250M+"], ["Revenue", "$1.7B+"], ["Engineers", "3,000+"], ["Employees", "5,000+"], ["Founded", "2006"], ["HQ", "Tel Aviv"]] },
    infographic: [{ heading: "Wix at a Glance", content: "250M+ users across 190 countries, NASDAQ listed (WIX), 3,000+ engineers, $1.7B+ annual revenue, 800+ templates." }],
    slidedeck: [
      { heading: "Wix Overview", content: "- Leading website builder platform\n- 250M+ users, $1.7B+ revenue\n- Founded 2006, NASDAQ: WIX\n- 5,000+ employees globally" },
      { heading: "Products", content: "- Drag-and-drop editor with 800+ templates\n- Wix Studio for agencies\n- eCommerce, Bookings, Events\n- Velo full-stack development platform" },
      { heading: "Technology", content: "- React + custom micro-frontend (Thunderbolt)\n- Node.js, Scala, Kotlin microservices\n- Kubernetes on GCP\n- 3,000+ engineers across multiple R&D centers" },
    ],
  },
  "monday-com": {
    description: "AI-generated analysis of monday.com, the work operating system for project and workflow management.",
    files: [{ fileName: "monday.com Company Profile.pdf", content: `## monday.com - Company Overview

monday.com is a cloud-based Work OS (Work Operating System) that enables organizations to build custom work management tools and run projects, processes, and everyday work. Founded in 2012 by Roy Mann and Eran Zinman under the original name dapulse, the company rebranded to monday.com in 2017. Headquartered in Tel Aviv, Israel, monday.com trades on NASDAQ (MNDY) after its IPO in June 2021 at a valuation of approximately $6.8 billion. The company has grown rapidly, reaching over 225,000 customers across 200+ countries.

## Products & Services

The monday.com platform is built around a flexible board-based interface where teams can create custom workflows without coding. Key products include:

- **monday work management**: The core product for project management, task tracking, and team collaboration. Features include customizable boards, 200+ templates, Gantt charts, Kanban views, timeline views, workload management, and dashboards for reporting.
- **monday sales CRM**: A dedicated customer relationship management tool built on the Work OS, offering lead management, deal tracking, pipeline visualization, contact management, and email integration. Designed to replace traditional CRMs like Salesforce for mid-market companies.
- **monday dev**: A product development tool for engineering teams that combines sprint planning, bug tracking, release management, and roadmapping. Integrates with GitHub, GitLab, and Jira for code-level visibility.
- **monday service**: A customer support and IT service management solution for managing tickets, SLAs, and customer requests.

The platform supports 200+ native integrations (Slack, Google Workspace, Microsoft 365, Salesforce, Zoom) and connects to thousands more through Zapier. Pricing starts at $8/seat/month (Basic) and scales to enterprise plans with advanced security, governance, and premium support.

## Technology & Engineering

monday.com's engineering team consists of over 800 engineers organized into autonomous squads following a microservices architecture. The technology stack includes:

- **Frontend**: React with TypeScript, custom component library (Vibe Design System - open source)
- **Backend**: Ruby on Rails (legacy monolith being decomposed), Node.js microservices, Go for performance-critical services
- **Infrastructure**: AWS-based, Kubernetes for orchestration, Terraform for IaC
- **Data**: BigQuery for analytics, Redis for caching, PostgreSQL and MySQL databases
- **AI**: monday AI assistant powered by proprietary models and OpenAI integration for automation suggestions, content generation, and formula building

The company has open-sourced several projects including the Vibe Design System (React component library), monday-ui-react-core, and BigBrain (analytics framework). Engineering culture emphasizes ownership, where each squad owns its domain end-to-end from design through deployment and monitoring.

## Market Position & Financials

monday.com reported $730M+ in annual revenue for 2024, growing at approximately 30% year-over-year. The company competes with Asana, Jira (Atlassian), ClickUp, Notion, Smartsheet, and Microsoft Project. Key differentiators include the highly visual and intuitive interface, the flexibility to support any workflow (not just software development), and the Work OS platform approach that allows building multiple specialized products on a single foundation.

The company has over 225,000 customers including enterprise clients like Coca-Cola, Canva, Lionsgate, and Universal Music Group. Net dollar retention rate exceeds 110%, indicating strong upselling and expansion within existing accounts. The company achieved GAAP profitability in 2024.

## Company Culture & Careers

monday.com employs approximately 2,000 people across offices in Tel Aviv (HQ), New York, London, Sydney, Miami, Chicago, Denver, and Sao Paulo. The company culture is known for its colorful branding, transparent communication, and emphasis on work-life balance. Employee reviews consistently highlight the collaborative environment, strong mentorship programs, and genuine investment in career growth.

Engineering roles span full-stack development, frontend platform, backend infrastructure, DevOps/SRE, data engineering, machine learning, mobile development, and security. The interview process typically includes a take-home assignment, technical discussion, system design (for senior roles), and team fit conversations. The company runs an engineering blog with deep technical posts about scaling challenges, architecture decisions, and open-source contributions.` }],
    quiz: [
      { question: "Who founded monday.com?", options: ["Roy Mann & Eran Zinman", "Avishai Abrahami", "Amit Gilon", "Dedi Gilad"], correctIndex: 0, explanation: "monday.com was founded in 2012 by Roy Mann and Eran Zinman." },
      { question: "What was monday.com's original name?", options: ["Workboard", "dapulse", "TaskFlow", "PulseWork"], correctIndex: 1, explanation: "monday.com was originally called dapulse before rebranding in 2017." },
      { question: "How many customers does monday.com serve?", options: ["50,000+", "100,000+", "225,000+", "500,000+"], correctIndex: 2, explanation: "monday.com serves over 225,000 customers across 200+ countries." },
    ],
    flashcards: [
      { front: "Work OS", back: "monday.com's term for their flexible platform that allows organizations to shape workflows to fit their needs, serving as a foundation for multiple products." },
      { front: "Vibe Design System", back: "monday.com's open-source React component library used to build consistent UI across their platform and available for the community." },
    ],
    report: [
      { heading: "Company Summary", content: "monday.com is a $730M+ revenue Work OS platform serving 225,000+ customers globally. NASDAQ listed (MNDY), 2,000 employees." },
      { heading: "Products", content: "Work management, Sales CRM, Dev tools, Service desk. Board-based interface, 200+ integrations, flexible workflow automation." },
    ],
    mindmap: { label: "monday.com", children: [{ label: "Products", children: [{ label: "Work Management" }, { label: "CRM" }, { label: "Dev" }, { label: "Service" }] }, { label: "Tech", children: [{ label: "React/TS" }, { label: "Ruby on Rails" }, { label: "Go" }] }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Revenue", "$730M+"], ["Customers", "225,000+"], ["Engineers", "800+"], ["Employees", "2,000"], ["Founded", "2012"]] },
    infographic: [{ heading: "monday.com", content: "225,000+ customers, Work OS powering millions of workflows. GAAP profitable in 2024." }],
    slidedeck: [
      { heading: "monday.com", content: "- Work OS platform\n- $730M+ revenue, GAAP profitable\n- 225,000+ customers in 200+ countries" },
      { heading: "Technology", content: "- React + TypeScript frontend\n- Ruby on Rails + Node.js + Go backend\n- AWS + Kubernetes\n- 800+ engineers in autonomous squads" },
    ],
  },
  jfrog: {
    description: "AI-generated analysis of JFrog, the universal software supply chain platform.",
    files: [{ fileName: "JFrog Company Profile.pdf", content: `## JFrog - Company Overview

JFrog Ltd. is a technology company providing a universal software supply chain platform. Founded in 2008 by Shlomi Ben Haim, Yoav Landman, and Fred Simon, JFrog is headquartered in Netanya, Israel, and trades on NASDAQ (FROG) after its IPO in September 2020. The company has pioneered the concept of "Liquid Software," a vision where software updates flow seamlessly, automatically, and securely from developers to edge devices without downtime. JFrog serves over 7,000 customers globally, including the majority of Fortune 100 companies.

## Products & Services

JFrog's platform provides end-to-end management of the software supply chain. Key products include:

- **JFrog Artifactory**: The world's most widely used universal binary repository manager. Artifactory supports every major package format including Docker, Maven, npm, PyPI, NuGet, Go, Helm, Conda, Conan, and 30+ others. It serves as the single source of truth for all binaries and build artifacts across the organization.
- **JFrog Xray**: A universal software composition analysis (SCA) tool that recursively scans all layers of binary components to detect vulnerabilities, license compliance issues, and operational risks. Xray integrates directly with Artifactory for continuous, context-aware scanning.
- **JFrog Pipelines**: A CI/CD orchestration engine that connects to any source control, build tool, or deployment target. Supports declarative YAML pipelines with native Artifactory and Xray integration.
- **JFrog Distribution**: A release management tool for distributing software packages securely to edge nodes, IoT devices, and remote locations with cryptographic signing and validation.
- **JFrog Connect**: An IoT device management platform for deploying and updating software on edge and IoT devices at scale.
- **JFrog ML**: Machine learning model management that extends DevOps practices to ML workflows, providing versioning, lineage tracking, and deployment of ML models.

JFrog offers both cloud-hosted (SaaS) and self-hosted deployment options. Pricing is subscription-based, starting with a free tier for individuals, scaling through Pro ($150/month), Enterprise ($750/month), and custom Enterprise+ plans for large organizations.

## Technology & Engineering

JFrog's platform is built primarily in Java and Go, with React powering the frontend. The company employs approximately 500 engineers across R&D centers in Netanya and Tel Aviv (Israel), Bangalore (India), and Toulouse (France). Key technical capabilities include:

- **Universal package management**: Native support for 30+ package formats through a pluggable architecture
- **Security scanning**: Deep recursive scanning that analyzes transitive dependencies, container layers, and build metadata
- **High availability**: Multi-site replication, active-active clustering, and disaster recovery across cloud regions
- **Scale**: Handles billions of downloads monthly for customers running at scale

JFrog actively contributes to the open-source community. Notably, the company created and maintains Artifactory OSS (the open-source version of Artifactory), and has contributed to projects like Conan (C/C++ package manager) and various CLI tools. The engineering team follows DevOps principles internally, with continuous deployment of the JFrog platform itself.

## Market Position & Financials

JFrog reported approximately $400M in annual revenue for fiscal year 2024, growing at roughly 25% year-over-year. The company competes with Sonatype Nexus, GitHub Packages, GitLab Package Registry, AWS CodeArtifact, and Azure Artifacts. JFrog's primary competitive advantage is universality, supporting more package formats and deployment targets than any competitor, combined with the integrated security scanning and distribution capabilities.

The company's customer base includes major enterprises like Google, Amazon, Netflix, Spotify, Twitter, and most major banks and government agencies. Cloud revenue (JFrog's SaaS offering) is the fastest-growing segment, representing over 60% of total revenue. The company has a strong land-and-expand motion with net dollar retention rates consistently above 125%.

## Company Culture & Careers

JFrog employs approximately 1,400 people globally. The company culture reflects its developer-first philosophy: engineering teams have significant autonomy, open-source contribution is encouraged, and the "frog" brand identity (green, playful, approachable) extends to the workplace environment. Offices in Netanya, Tel Aviv, Bangalore, Toulouse, San Jose, and Atlanta.

Engineering roles at JFrog include platform development (Java, Go), security research, cloud infrastructure, frontend development (React), data engineering, and developer advocacy. The company actively participates in tech conferences (swampUP is their annual user conference) and maintains a strong presence in the DevOps community.` }],
    quiz: [
      { question: "What is JFrog Artifactory?", options: ["A CI/CD tool", "A binary repository manager", "A cloud provider", "A database"], correctIndex: 1, explanation: "JFrog Artifactory is the world's most widely used universal binary repository manager, supporting 30+ package formats." },
      { question: "How many package formats does Artifactory support?", options: ["5+", "10+", "20+", "30+"], correctIndex: 3, explanation: "Artifactory natively supports over 30 package formats including Docker, Maven, npm, PyPI, and more." },
    ],
    flashcards: [
      { front: "Liquid Software", back: "JFrog's vision of software updates flowing seamlessly, automatically, and securely from developers to production and edge devices without downtime." },
      { front: "JFrog Xray", back: "Universal SCA tool that recursively scans binary components to detect vulnerabilities, license compliance issues, and operational risks." },
    ],
    report: [
      { heading: "Company Summary", content: "JFrog provides the universal software supply chain platform serving 7,000+ enterprise customers including most Fortune 100 companies. $400M revenue." },
      { heading: "Technology", content: "Built in Java and Go with React frontend. 500+ engineers. Supports 30+ package formats through pluggable architecture." },
    ],
    mindmap: { label: "JFrog", children: [{ label: "Products", children: [{ label: "Artifactory" }, { label: "Xray" }, { label: "Pipelines" }, { label: "Distribution" }] }, { label: "Tech", children: [{ label: "Java" }, { label: "Go" }, { label: "React" }] }] },
    datatable: { columns: ["Product", "Function"], rows: [["Artifactory", "Binary repository (30+ formats)"], ["Xray", "Security scanning (SCA)"], ["Pipelines", "CI/CD orchestration"], ["Distribution", "Release management"], ["Connect", "IoT device management"]] },
    infographic: [{ heading: "JFrog", content: "7,000+ customers, $400M revenue, 30+ package formats, billions of monthly downloads." }],
    slidedeck: [
      { heading: "JFrog Overview", content: "- Universal software supply chain platform\n- 7,000+ customers, most Fortune 100\n- NASDAQ: FROG, $400M revenue" },
      { heading: "Products & Tech", content: "- Artifactory + Xray + Pipelines + Distribution\n- Java, Go, React stack\n- 500+ engineers, 1,400 employees\n- Cloud-first (60%+ of revenue)" },
    ],
  },
  gong: {
    description: "AI-generated analysis of Gong, the revenue intelligence platform.",
    files: [{ fileName: "Gong Company Profile.pdf", content: `## Gong - Company Overview

Gong.io is a revenue intelligence platform that uses AI to capture and analyze customer interactions across calls, emails, and meetings. Founded in 2015 by Amit Bendov (CEO) and Eilon Reshef (CTO), Gong is headquartered in Tel Aviv with US offices in San Francisco and New York. The company has raised over $580 million in funding and reached a valuation of $7.25 billion in its Series E round (June 2021). Gong serves over 4,000 customers worldwide, including enterprise organizations across technology, financial services, healthcare, and manufacturing sectors.

## Products & Services

Gong's platform automatically records, transcribes, and analyzes customer-facing interactions to provide actionable intelligence for revenue teams. Key capabilities include:

- **Conversation Intelligence**: Automatically records and transcribes sales calls, video meetings, and demos. AI analyzes conversations for topics discussed, competitor mentions, pricing objections, next steps, and sentiment. Provides talk-to-listen ratios, question frequency, and engagement metrics.
- **Deal Intelligence**: Aggregates signals from all customer touchpoints (calls, emails, meetings, CRM data) to provide an objective view of deal health. AI predicts deal outcomes, flags at-risk opportunities, and identifies the most impactful actions to advance deals.
- **People Intelligence**: Analyzes individual and team performance patterns. Identifies coaching opportunities, best practices from top performers, and skill gaps. Enables managers to provide data-driven coaching rather than relying on gut feel.
- **Market Intelligence**: Surfaces competitive trends, product feedback, and market sentiment from real customer conversations. Helps product and marketing teams understand what customers actually say about competitors, features, and pain points.
- **Gong Engage**: An AI-powered sales engagement platform for creating personalized outreach sequences. Uses conversation intelligence to recommend the best messaging, timing, and channels for each prospect.
- **Gong Forecast**: AI-powered revenue forecasting that replaces manual pipeline reviews with data-driven predictions based on actual deal activity and historical patterns.

Gong integrates with major CRMs (Salesforce, HubSpot, Microsoft Dynamics), communication platforms (Zoom, Microsoft Teams, Google Meet, Webex), email providers, and 100+ other tools. Pricing is per-user per-year, typically ranging from $1,200 to $1,600 per seat for enterprise contracts.

## Technology & Engineering

Gong's AI processes millions of customer interactions using advanced natural language processing, speech recognition, and machine learning. The engineering team works with:

- **AI/ML**: Proprietary models for speech-to-text, topic extraction, sentiment analysis, and predictive analytics. Models are trained on billions of data points from real business conversations.
- **Backend**: Python for ML services, TypeScript/Node.js for application services, microservices architecture
- **Frontend**: React with TypeScript
- **Infrastructure**: AWS-based, Kubernetes for orchestration, significant investment in data pipeline infrastructure for processing audio/video at scale
- **Data**: Apache Kafka for streaming, custom data lake architecture for conversation analytics

Gong's R&D team is approximately 400 engineers, primarily based in Tel Aviv and Herzliya. The company is known for its strong data science team that continuously improves the accuracy and scope of AI models. Gong processes and analyzes conversations in multiple languages, with support for English, Spanish, French, German, Portuguese, Japanese, and others.

## Market Position

Gong is the market leader in revenue intelligence, a category it effectively created. Competitors include Chorus.ai (acquired by ZoomInfo), Clari, People.ai, Outreach, and SalesLoft. Gong's primary advantage is the depth and accuracy of its conversation analysis, the breadth of signals it captures across the revenue cycle, and its strong adoption among enterprise sales teams. The platform has become a standard tool at many technology companies and is expanding into financial services, healthcare, and other regulated industries.

## Company Culture & Careers

Gong employs approximately 1,200 people. The company culture emphasizes data-driven decision making (unsurprisingly), transparency, and customer obsession. Gong has consistently been ranked as one of the best places to work by Glassdoor, with particularly high ratings for engineering satisfaction. The company offers competitive compensation, equity packages, and emphasizes professional growth through internal knowledge-sharing sessions called "Gong Shows."

Engineering roles include machine learning engineers, data scientists, backend developers, frontend engineers, DevOps/infrastructure engineers, and security specialists. The company actively recruits ML researchers and NLP experts for its core AI team.` }],
    quiz: [
      { question: "What does Gong analyze?", options: ["Code", "Customer interactions", "Financial data", "HR records"], correctIndex: 1, explanation: "Gong analyzes customer-facing interactions across calls, emails, and meetings using AI." },
      { question: "What is Gong's valuation?", options: ["$1 billion", "$3.5 billion", "$7.25 billion", "$15 billion"], correctIndex: 2, explanation: "Gong reached a $7.25 billion valuation in its Series E round in June 2021." },
    ],
    flashcards: [
      { front: "Revenue Intelligence", back: "AI-driven analysis of customer interactions (calls, emails, meetings) to provide actionable insights for sales teams about deal health, coaching opportunities, and market trends." },
      { front: "Gong Deal Intelligence", back: "Aggregates signals from all customer touchpoints to provide objective deal health scores, predict outcomes, flag risks, and recommend actions." },
    ],
    report: [
      { heading: "Company Summary", content: "Gong is the market leader in revenue intelligence, valued at $7.25B, serving 4,000+ customers with AI-powered conversation and deal analysis." },
      { heading: "Technology", content: "Proprietary NLP/ML models, Python + TypeScript backend, React frontend, 400 engineers. Processes millions of interactions in multiple languages." },
    ],
    mindmap: { label: "Gong", children: [{ label: "Intelligence", children: [{ label: "Conversation" }, { label: "Deal" }, { label: "People" }, { label: "Market" }] }, { label: "Products", children: [{ label: "Engage" }, { label: "Forecast" }] }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Valuation", "$7.25B"], ["Customers", "4,000+"], ["Employees", "1,200"], ["Engineers", "~400"], ["Founded", "2015"], ["Total Funding", "$580M+"]] },
    infographic: [{ heading: "Gong", content: "$7.25B valuation, AI-powered revenue intelligence for 4,000+ customers. Processes millions of interactions." }],
    slidedeck: [
      { heading: "Gong Overview", content: "- Revenue intelligence platform\n- $7.25B valuation, $580M+ raised\n- 4,000+ customers, 1,200 employees" },
      { heading: "Capabilities", content: "- Conversation, Deal, People, Market intelligence\n- AI-powered forecasting and engagement\n- 100+ integrations (Salesforce, Zoom, Teams)" },
    ],
  },
  "check-point": {
    description: "AI-generated analysis of Check Point Software Technologies, a cybersecurity leader.",
    files: [{ fileName: "Check Point Company Profile.pdf", content: `## Check Point Software Technologies - Company Overview

Check Point Software Technologies Ltd. is a leading provider of cybersecurity solutions for enterprises and governments worldwide. Founded in 1993 by Gil Shwed, Marius Nacht, and Shlomo Kramer, the company is headquartered in Tel Aviv and Ramat Gan, Israel. Check Point is publicly traded on NASDAQ (CHKP) and is considered one of the founding companies of the modern cybersecurity industry. Gil Shwed, who invented the stateful inspection firewall at age 25, served as CEO for nearly 30 years until Nadav Zafrir took over as CEO in December 2024. The company has approximately 6,000 employees and serves over 100,000 organizations globally.

## Products & Services

Check Point's product strategy centers around the Infinity architecture, a consolidated security platform that provides unified threat prevention across all attack vectors. Key products include:

- **Quantum Security Gateways**: Next-generation firewalls (NGFW) for network security, ranging from small office appliances to hyperscale data center solutions. Features include intrusion prevention (IPS), application control, URL filtering, anti-bot, sandboxing (SandBlast), and zero-day protection.
- **CloudGuard**: A comprehensive cloud-native security platform providing cloud network security, workload protection (CWPP), cloud security posture management (CSPM), and application security (AppSec). Supports AWS, Azure, GCP, and Kubernetes environments.
- **Harmony**: A unified workspace security suite covering endpoint protection (Harmony Endpoint), email security (Harmony Email & Collaboration), secure web browsing (Harmony Browse), and mobile security (Harmony Mobile). Designed for the hybrid workforce.
- **Infinity ThreatCloud AI**: The intelligence engine powering all Check Point products. ThreatCloud AI processes billions of cyber events daily, uses over 40 AI engines, and leverages data from 150,000+ connected gateways and millions of endpoints to identify and prevent zero-day attacks in real-time.
- **Horizon**: Security operations and management, including Horizon Events (SIEM integration), Horizon NDR (network detection and response), and Horizon Playblocks (SOAR - security orchestration and automated response).

Check Point offers both hardware appliances and software/cloud-based security solutions. Licensing follows a subscription model with annual or multi-year terms, typically bundled with security management and threat intelligence services.

## Technology & Engineering

Check Point's R&D organization is one of the largest in the cybersecurity industry, with the main R&D center in Tel Aviv employing thousands of engineers. The technology stack spans:

- **Core security engines**: C/C++ for high-performance packet inspection, firewall kernels, and network security appliances
- **Cloud and application layer**: Python, Java, Go for cloud security services, APIs, and microservices
- **Frontend and management**: React, TypeScript for the Infinity Portal management console
- **AI/ML**: Proprietary machine learning models for threat detection, behavioral analysis, and zero-day prevention. Over 40 distinct AI engines within ThreatCloud AI.
- **Research**: Check Point Research (CPR) is one of the most respected threat intelligence teams in the industry, regularly discovering and responsibly disclosing major vulnerabilities (CVEs) in widely-used software.

The company maintains a strong patent portfolio with hundreds of security-related patents. Check Point pioneered stateful inspection (the foundation of modern firewalls), and continues to innovate in areas like AI-powered threat prevention, SASE (Secure Access Service Edge), and quantum-safe cryptography.

## Market Position & Financials

Check Point reported approximately $2.6 billion in annual revenue for 2024, with strong profitability and over $3 billion in cash reserves. The company competes with Palo Alto Networks, Fortinet, Cisco, CrowdStrike, and Zscaler. While Palo Alto Networks has surpassed Check Point in revenue through aggressive acquisition-driven growth, Check Point maintains advantages in consolidated security architecture, operational efficiency (highest profit margins in the industry at ~35% operating margin), and breadth of integrated security capabilities.

The company's customer base includes 100,000+ organizations across all verticals including financial services, government, healthcare, education, and technology. Check Point consistently receives leadership positions in Gartner Magic Quadrants for network firewalls and has been recognized by NSS Labs, MITRE ATT&CK evaluations, and other independent testing organizations.

## Company Culture & Careers

Check Point employs approximately 6,000 people with offices in Tel Aviv (HQ), Ramat Gan, San Carlos (California), Dallas, Ottawa, London, Munich, Singapore, Sydney, and other cities. The company offers a stable, established work environment with competitive compensation, strong R&D investment, and opportunities to work on critical cybersecurity challenges. Check Point runs a well-known Security Academy program for training the next generation of cybersecurity professionals and regularly participates in CTF competitions and security conferences (CPX is their annual customer event).

Engineering roles include security researcher, kernel developer, cloud security engineer, full-stack developer, data scientist/ML engineer, DevOps engineer, and QA automation. The company values deep technical expertise and offers paths for both individual contributors and management.` }],
    quiz: [
      { question: "What did Check Point pioneer?", options: ["Cloud computing", "The stateful inspection firewall", "Social media", "E-commerce"], correctIndex: 1, explanation: "Check Point pioneered stateful inspection firewalls. Gil Shwed invented the technology at age 25." },
      { question: "How many organizations does Check Point protect?", options: ["10,000+", "50,000+", "100,000+", "500,000+"], correctIndex: 2, explanation: "Check Point serves over 100,000 organizations globally across all verticals." },
    ],
    flashcards: [
      { front: "ThreatCloud AI", back: "Check Point's AI-powered threat intelligence engine that processes billions of cyber events daily using 40+ AI engines and data from 150,000+ connected gateways." },
      { front: "Infinity Architecture", back: "Check Point's consolidated security platform providing unified threat prevention across network, cloud, mobile, and endpoint attack vectors." },
    ],
    report: [
      { heading: "Company Summary", content: "Check Point is a NASDAQ-listed cybersecurity pioneer protecting 100,000+ organizations since 1993. $2.6B revenue, ~35% operating margins." },
      { heading: "Technology", content: "C/C++ security kernels, Python/Java/Go cloud services, 40+ AI engines in ThreatCloud. Leading threat research team (CPR)." },
    ],
    mindmap: { label: "Check Point", children: [{ label: "Products", children: [{ label: "Quantum (Network)" }, { label: "CloudGuard (Cloud)" }, { label: "Harmony (Workspace)" }, { label: "Horizon (SOC)" }] }, { label: "Intelligence", children: [{ label: "ThreatCloud AI" }, { label: "CPR Research" }] }] },
    datatable: { columns: ["Product", "Focus"], rows: [["Quantum", "Network firewalls/IPS"], ["CloudGuard", "Cloud security (CWPP/CSPM)"], ["Harmony", "Endpoint/Email/Mobile"], ["Horizon", "SOC operations"], ["ThreatCloud AI", "Threat intelligence"]] },
    infographic: [{ heading: "Check Point", content: "30+ years in cybersecurity, 100,000+ organizations protected, $2.6B revenue, 6,000 employees, 40+ AI engines." }],
    slidedeck: [
      { heading: "Check Point Overview", content: "- Cybersecurity pioneer (1993)\n- 100,000+ customers, $2.6B revenue\n- 6,000 employees globally" },
      { heading: "Platform", content: "- Infinity consolidated architecture\n- Quantum + CloudGuard + Harmony + Horizon\n- ThreatCloud AI: 40+ engines, billions of events/day" },
    ],
  },
  tabnine: {
    description: "AI-generated analysis of Tabnine, the AI code assistant platform.",
    files: [{ fileName: "Tabnine Company Profile.pdf", content: `## Tabnine - Company Overview

Tabnine is an AI-powered code assistant that helps developers write code faster through intelligent code completions, chat, and code generation. Founded in 2013 as Codota by Dror Weiss and Professor Eran Yahav (a computer science professor at the Technion, Israel's MIT equivalent), Tabnine is headquartered in Tel Aviv, Israel. The company rebranded from Codota to Tabnine in 2021, naming itself after the Tab key that developers press to accept completions and the number 9 (representing the original GPT-2 model with 9 billion parameters they fine-tuned). Tabnine serves over 1 million developers and has raised approximately $55 million in funding, including a $25 million Series B in 2022.

## Products & Services

Tabnine provides AI-powered development tools that emphasize privacy, customization, and enterprise readiness:

- **Code Completions**: Real-time, context-aware code suggestions as you type. Tabnine analyzes the current file, open tabs, project structure, and documentation to provide relevant completions. Supports 30+ programming languages including JavaScript, TypeScript, Python, Java, Go, Rust, C#, Ruby, PHP, and more.
- **AI Chat**: A conversational interface for asking questions about code, generating functions, explaining complex logic, debugging errors, and getting architecture recommendations. Unlike general-purpose chatbots, Tabnine's chat is grounded in the developer's actual codebase and coding patterns.
- **Code Generation**: Generate entire functions, classes, tests, and documentation from natural language descriptions. Tabnine understands project context and coding conventions to produce code that matches the team's style.
- **Test Generation**: Automatically create unit tests for existing code, covering edge cases and following the project's testing framework patterns.
- **Code Review**: AI-powered review suggestions that identify bugs, security issues, performance problems, and style inconsistencies.
- **Tabnine Enterprise**: The flagship product for organizations, providing:
  - **Custom AI models**: Train on the organization's proprietary codebase so completions reflect internal frameworks, APIs, and patterns
  - **Zero data retention**: No code is stored or used for training. All queries are processed and discarded immediately.
  - **Deployment flexibility**: Available as SaaS, VPC deployment, or fully air-gapped on-premises installation
  - **Admin controls**: Usage analytics, team management, model customization settings, and compliance dashboards

Tabnine integrates with all major IDEs: VS Code, IntelliJ IDEA, WebStorm, PyCharm, Android Studio, Eclipse, Neovim, Vim, and Sublime Text. Pricing includes a free tier (basic completions), Pro at $12/user/month (advanced completions + chat), and Enterprise with custom pricing for organizations requiring private deployment and model customization.

## Technology & Engineering

Tabnine was one of the first companies to apply deep learning to code completion, predating GitHub Copilot by several years. Key technical aspects:

- **AI Models**: Tabnine uses a combination of proprietary models and fine-tuned open-source models. Their models are trained exclusively on permissively licensed open-source code (MIT, Apache 2.0, BSD), avoiding legal risks associated with copyleft or unlicensed code. For enterprise customers, additional models can be fine-tuned on the organization's private codebase.
- **Architecture**: The platform supports both local execution (models run on the developer's machine for maximum privacy) and cloud execution (for more powerful models). This hybrid approach lets developers choose their privacy/capability tradeoff.
- **Engineering stack**: Python and PyTorch for ML training and inference, TypeScript for IDE extensions and web services, Rust for performance-critical inference components, Go for backend services.
- **Privacy-first design**: Tabnine's architecture is fundamentally designed around data privacy. Enterprise deployments can be completely isolated with no data leaving the customer's network. This has made Tabnine particularly popular in regulated industries (banking, defense, healthcare) where data sovereignty is critical.

The company employs approximately 200 people, with the majority in R&D (ML researchers, infrastructure engineers, IDE plugin developers). Tabnine's research team publishes at top ML conferences and maintains close ties with academic institutions.

## Market Position

Tabnine competes with GitHub Copilot (Microsoft), Amazon CodeWhisperer (now Amazon Q Developer), Cursor, Codeium, and Sourcegraph Cody. While GitHub Copilot leads in individual developer adoption due to its integration with GitHub and VS Code, Tabnine differentiates through its privacy-first approach, enterprise deployment flexibility (including air-gapped), and model customization capabilities. Tabnine is often the choice for organizations in regulated industries, defense contractors, and any company concerned about code data flowing to third-party cloud providers.

## Company Culture & Careers

Tabnine operates primarily from Tel Aviv with a distributed workforce. The company culture is research-oriented with a strong emphasis on developer empathy (the team uses their own product daily). Engineering roles include ML researchers, model training engineers, IDE extension developers, backend infrastructure engineers, and DevOps. The company values deep technical expertise, open-source contributions, and a pragmatic approach to AI development.` }],
    quiz: [
      { question: "What makes Tabnine unique?", options: ["Free pricing", "Privacy-first AI coding", "Only supports Python", "Game development"], correctIndex: 1, explanation: "Tabnine is known for its privacy-first approach, offering air-gapped deployments and zero data retention." },
      { question: "What was Tabnine originally called?", options: ["CodeAI", "Codota", "TabCode", "AutoDev"], correctIndex: 1, explanation: "Tabnine was originally founded as Codota in 2013, rebranding to Tabnine in 2021." },
    ],
    flashcards: [
      { front: "Tabnine Enterprise", back: "Enterprise AI code assistant with custom model training on proprietary codebases, zero data retention, and air-gapped deployment options for regulated industries." },
      { front: "Privacy-first AI", back: "Tabnine's core differentiator: models can run locally, code is never stored, and enterprise deployments can be fully isolated from the internet." },
    ],
    report: [
      { heading: "Company Summary", content: "Tabnine serves 1M+ developers with privacy-first AI code assistance across 30+ languages. $55M raised, headquartered in Tel Aviv." },
      { heading: "Differentiation", content: "Privacy-first with air-gapped enterprise deployment, zero data retention, and custom model training on proprietary codebases. Popular in regulated industries." },
    ],
    mindmap: { label: "Tabnine", children: [{ label: "Features", children: [{ label: "Completions" }, { label: "Chat" }, { label: "Code Gen" }, { label: "Tests" }] }, { label: "Enterprise", children: [{ label: "Custom Models" }, { label: "Air-gapped" }, { label: "Zero Retention" }] }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Developers", "1M+"], ["Languages", "30+"], ["IDEs", "9+"], ["Founded", "2013 (as Codota)"], ["Funding", "$55M"]] },
    infographic: [{ heading: "Tabnine", content: "1M+ developers, privacy-first AI coding assistant. 30+ languages, 9+ IDE integrations, air-gapped enterprise option." }],
    slidedeck: [
      { heading: "Tabnine Overview", content: "- AI code assistant (privacy-first)\n- 1M+ developers, 30+ languages\n- $55M funding, Tel Aviv HQ" },
      { heading: "Enterprise", content: "- Custom models on private codebases\n- Air-gapped and VPC deployment\n- Zero data retention\n- Popular in banking, defense, healthcare" },
    ],
  },
  snyk: {
    description: "AI-generated analysis of Snyk, the developer-first security platform.",
    files: [{ fileName: "Snyk Company Profile.pdf", content: `## Snyk - Company Overview

Snyk (pronounced "sneak") is a developer-first security platform that helps software development teams find and fix vulnerabilities in their code, open-source dependencies, containers, and infrastructure as code. Founded in 2015 by Guy Podjarny (previously at Akamai, where he led web performance and security), Assaf Hefetz, and Danny Grander, Snyk is headquartered in Boston, Massachusetts, with a major R&D center in Tel Aviv, Israel. The company has raised over $1 billion in total funding, with its peak valuation reaching $8.5 billion in 2022. Snyk serves millions of developers and thousands of enterprise customers worldwide.

## Products & Services

Snyk's platform provides security tools that integrate directly into developer workflows rather than requiring a separate security team intervention. Key products include:

- **Snyk Code (SAST)**: Static Application Security Testing that scans proprietary source code for vulnerabilities in real-time. Unlike traditional SAST tools that are slow and produce many false positives, Snyk Code uses a semantic analysis engine that understands code intent and provides actionable fix suggestions. Supports 15+ languages.
- **Snyk Open Source (SCA)**: Software Composition Analysis that identifies vulnerabilities in open-source dependencies. Snyk maintains the industry's largest vulnerability database for open-source, with detailed remediation guidance including automated fix pull requests that upgrade to the nearest non-vulnerable version.
- **Snyk Container**: Container security that scans Docker images and Kubernetes workloads for operating system and application-level vulnerabilities. Provides base image recommendations to minimize the vulnerability surface.
- **Snyk Infrastructure as Code (IaC)**: Scans Terraform, CloudFormation, Kubernetes manifests, and ARM templates for misconfigurations and security issues before deployment. Includes 300+ built-in security rules.
- **Snyk Cloud**: Runtime cloud security that monitors deployed cloud environments for misconfigurations and compliance violations. Connects infrastructure-as-code definitions to running cloud resources for full lifecycle visibility.
- **Snyk AppRisk**: Application security posture management (ASPM) that provides visibility across the entire application portfolio. Identifies coverage gaps, prioritizes risks based on business context, and orchestrates security testing across all Snyk products and third-party tools.

Snyk integrates with the developer toolchain: IDE plugins (VS Code, IntelliJ, Eclipse), source control (GitHub, GitLab, Bitbucket, Azure DevOps), CI/CD pipelines (Jenkins, CircleCI, GitHub Actions), and container registries (Docker Hub, ECR, GCR, ACR). Pricing includes a free tier (unlimited tests for individual developers), Team plan ($25/user/month), and Enterprise with custom pricing.

## Technology & Engineering

Snyk's engineering organization includes over 500 engineers across Tel Aviv, London, Ottawa, Zurich, and remote locations. The technology stack includes:

- **Core platform**: TypeScript and Node.js for the main application services, Go for performance-critical scanning engines
- **Security intelligence**: Proprietary vulnerability database curated by Snyk's security research team, supplemented by machine learning models for vulnerability detection and prioritization
- **Frontend**: React with TypeScript
- **Infrastructure**: AWS-based, Kubernetes, extensive use of serverless (Lambda) for scaling scan workloads
- **Data**: PostgreSQL, Redis, Elasticsearch, custom data pipelines for vulnerability intelligence

Snyk's engineering culture emphasizes "shift left" security, dogfooding (using their own products extensively), and developer experience. The company contributes to open-source projects and maintains several open-source tools. Snyk's Security Research team regularly discovers and responsibly discloses vulnerabilities in popular open-source packages and has published extensively on supply chain security threats.

## Market Position & Financials

Snyk's revenue is estimated at $300-400 million annually (the company is private and does not publicly disclose financials). The company competes with Veracode, Checkmarx, SonarQube/SonarCloud, Mend (formerly WhiteSource), Black Duck (Synopsys), and Dependabot (GitHub). Snyk's primary competitive advantage is its developer-first approach: security tools that feel native to the developer workflow rather than bolted-on security gates.

The company's customer base includes enterprise organizations like Google, Salesforce, Atlassian, and hundreds of Fortune 500 companies. Snyk has been recognized as a leader in Gartner and Forrester reports for application security testing, and has a particularly strong following among DevOps teams and organizations adopting DevSecOps practices.

## Company Culture & Careers

Snyk employs approximately 1,000 people globally. The company culture is known for being collaborative, transparent, and developer-centric. Snyk runs a "Security Research" program where engineers can spend dedicated time on vulnerability research. The company has offices in Boston, Tel Aviv, London, Ottawa, and Zurich, with significant remote work flexibility.

Engineering roles include security researchers, platform engineers, full-stack developers, ML engineers, DevOps/SRE, and developer relations. Snyk actively hires in both Israel and internationally, with a strong emphasis on security expertise and open-source community involvement.` }],
    quiz: [
      { question: "What does SAST stand for?", options: ["Simple App Security Test", "Static Application Security Testing", "Snyk App Scanning Tool", "Software Analysis System"], correctIndex: 1, explanation: "SAST stands for Static Application Security Testing, which Snyk provides via Snyk Code." },
      { question: "What does SCA stand for in Snyk's context?", options: ["Security Code Audit", "Software Composition Analysis", "Snyk Cloud Analyzer", "Static Code Assessment"], correctIndex: 1, explanation: "SCA stands for Software Composition Analysis, provided by Snyk Open Source for scanning dependencies." },
    ],
    flashcards: [
      { front: "Snyk Code", back: "Snyk's SAST product that uses semantic analysis to find vulnerabilities in proprietary source code with low false positives and actionable fix suggestions." },
      { front: "Developer-first Security", back: "Snyk's approach to security tooling: integrating directly into developer workflows (IDE, SCM, CI/CD) rather than requiring separate security team intervention." },
    ],
    report: [
      { heading: "Company Summary", content: "Snyk is a developer-first security platform valued at $8.5B, serving millions of developers. 500+ engineers, $1B+ total funding." },
      { heading: "Products", content: "Snyk Code (SAST), Open Source (SCA), Container, IaC, Cloud, and AppRisk. Integrates with IDEs, SCM, CI/CD, and registries." },
    ],
    mindmap: { label: "Snyk", children: [{ label: "Products", children: [{ label: "Code (SAST)" }, { label: "Open Source (SCA)" }, { label: "Container" }, { label: "IaC" }, { label: "Cloud" }] }, { label: "Tech", children: [{ label: "TypeScript" }, { label: "Go" }, { label: "React" }] }] },
    datatable: { columns: ["Product", "Type"], rows: [["Snyk Code", "SAST"], ["Snyk Open Source", "SCA"], ["Snyk Container", "Container security"], ["Snyk IaC", "IaC scanning"], ["Snyk Cloud", "Runtime cloud security"], ["Snyk AppRisk", "ASPM"]] },
    infographic: [{ heading: "Snyk", content: "$1B+ funded, $8.5B peak valuation. Developer-first security for millions of developers worldwide." }],
    slidedeck: [
      { heading: "Snyk Overview", content: "- Developer-first security platform\n- $8.5B valuation, $1B+ raised\n- Millions of developers, 1,000 employees" },
      { heading: "Products", content: "- Code (SAST) + Open Source (SCA)\n- Container + IaC + Cloud\n- AppRisk for portfolio management\n- TypeScript, Go, React stack" },
    ],
  },
  appsflyer: {
    description: "AI-generated analysis of AppsFlyer, the mobile attribution and marketing analytics platform.",
    files: [{ fileName: "AppsFlyer Company Profile.pdf", content: `## AppsFlyer - Company Overview

AppsFlyer is the global leader in mobile attribution and marketing analytics, helping brands measure and optimize their marketing campaigns across mobile, web, CTV (Connected TV), and PC/console platforms. Founded in 2011 by Oren Kaniel (CEO) and Reshef Mann (CTO), AppsFlyer is headquartered in Herzliya, Israel, with 20+ offices worldwide including San Francisco, New York, London, Berlin, Tokyo, Seoul, Beijing, Bangkok, and Sao Paulo. The company has raised approximately $300 million in funding and is reportedly valued at over $2 billion. AppsFlyer is trusted by over 12,000 brands and technology partners, processing billions of mobile events daily.

## Products & Services

AppsFlyer provides a comprehensive measurement and analytics suite for digital marketers:

- **Attribution**: The core product that determines which marketing campaign, channel, or touchpoint led a user to install and engage with an app. Supports multi-touch attribution, view-through attribution, and probabilistic modeling. Works across iOS (including SKAdNetwork/SKAN support for Apple's privacy framework), Android, web, and CTV platforms.
- **OneLink**: A deep linking and smart linking solution that routes users to the right content regardless of platform, device, or whether the app is installed. Supports deferred deep linking, QR codes, web-to-app banners, and cross-platform journeys.
- **Protect360**: An integrated fraud protection suite that detects and blocks install fraud, in-app fraud, click flooding, click injection, device farms, bots, and other forms of mobile ad fraud in real-time. Uses machine learning and behavioral analysis to identify anomalies.
- **Audiences**: A segmentation and audience building tool that creates targeted user lists based on attribution data, in-app events, and user properties. Syncs audiences to advertising networks for retargeting campaigns.
- **ROI360**: A cost aggregation and ROI measurement tool that connects campaign spend data from all media sources with revenue and LTV (lifetime value) data to calculate true return on ad spend (ROAS) by campaign, channel, and creative.
- **Incrementality**: A measurement methodology using test/control experiments to determine the true incremental impact of marketing campaigns beyond what would have happened organically.
- **Data Locker**: Raw data export solution that streams granular attribution and in-app event data to the customer's cloud storage (AWS S3, GCS, Azure Blob) or data warehouse (Snowflake, BigQuery) for custom analysis.
- **Privacy Cloud**: A privacy-preserving measurement solution built on clean room technology, enabling data collaboration between advertisers and publishers without exposing user-level data. Designed for the post-IDFA, privacy-first era.

AppsFlyer integrates with over 10,000 media partners, ad networks, and technology platforms including Google Ads, Meta, TikTok, Snap, Apple Search Ads, Twitter, Unity Ads, ironSource, and thousands more. Pricing is typically based on the number of non-organic installs attributed, with enterprise contracts customized to volume.

## Technology & Engineering

AppsFlyer processes over 100 billion API calls daily and handles massive data volumes in real-time. The engineering team of 500+ spans offices in Herzliya, Kiev, and other locations. Key technical infrastructure:

- **Backend**: Java and Scala for core data processing services, Python for data science and ML services, Go for high-performance API gateways
- **Data pipeline**: Apache Kafka for event streaming, Apache Druid for real-time analytics and OLAP queries, custom-built data lake on AWS S3
- **Infrastructure**: AWS-based with multi-region deployment, Kubernetes for container orchestration, Terraform for infrastructure as code
- **Frontend**: React with TypeScript for the analytics dashboard
- **ML/AI**: Machine learning models for fraud detection (Protect360), predictive analytics, and attribution modeling. Uses TensorFlow and custom frameworks.

AppsFlyer's architecture is designed for extreme scale, low latency (sub-second attribution), and reliability (99.99% uptime SLA). The company processes more mobile events than most ad networks see, giving them a unique vantage point on the mobile ecosystem. They invest heavily in data privacy engineering, having built privacy-preserving measurement solutions in response to Apple's App Tracking Transparency (ATT) framework and evolving global privacy regulations (GDPR, CCPA).

## Market Position & Financials

AppsFlyer is the clear market leader in mobile attribution, holding approximately 70% market share among the top 100 mobile advertisers. Competitors include Adjust (acquired by AppLovin), Branch, Kochava, and Singular. AppsFlyer's advantages include the largest integration network (10,000+ partners), the most comprehensive fraud protection, and the deepest measurement capabilities across platforms.

The company is estimated to have annual revenue exceeding $400 million and is profitable. AppsFlyer's customer base includes major brands across gaming (EA, Zynga, King), e-commerce (eBay, Nike, Walmart), fintech (PayPal, Revolut), travel (Booking.com, Expedia), food delivery (DoorDash, Delivery Hero), and media (Disney, HBO Max).

## Company Culture & Careers

AppsFlyer employs approximately 1,200 people across 20+ offices worldwide. The company culture emphasizes innovation, customer obsession, and data integrity. AppsFlyer has been recognized as a best workplace in Israel and globally, with strong employee ratings for work-life balance, compensation, and career growth opportunities.

Engineering roles include backend developers (Java/Scala), data engineers, ML engineers, frontend developers (React), DevOps/SRE, security engineers, and mobile SDK developers. The company is known for its challenging technical interviews that focus on system design and data processing at scale.` }],
    quiz: [
      { question: "How many API calls does AppsFlyer process daily?", options: ["1 billion", "10 billion", "100 billion", "1 trillion"], correctIndex: 2, explanation: "AppsFlyer processes over 100 billion API calls daily across its platform." },
      { question: "What is AppsFlyer's market share among top mobile advertisers?", options: ["30%", "50%", "70%", "90%"], correctIndex: 2, explanation: "AppsFlyer holds approximately 70% market share among the top 100 mobile advertisers." },
    ],
    flashcards: [
      { front: "Mobile Attribution", back: "The process of identifying which marketing campaign, channel, or touchpoint led a user to install and engage with a mobile app. AppsFlyer's core product." },
      { front: "Protect360", back: "AppsFlyer's integrated fraud protection suite using ML and behavioral analysis to detect and block install fraud, click fraud, device farms, and bots in real-time." },
      { front: "Privacy Cloud", back: "AppsFlyer's clean room technology for privacy-preserving measurement, enabling data collaboration without exposing user-level data in the post-IDFA era." },
    ],
    report: [
      { heading: "Company Summary", content: "AppsFlyer is the global leader in mobile attribution with ~70% market share among top advertisers. 12,000+ brands, 100B+ daily API calls, $400M+ estimated revenue." },
      { heading: "Technology", content: "Java/Scala/Go backend, Apache Kafka + Druid for real-time processing, 500+ engineers. ML-powered fraud detection and attribution modeling." },
    ],
    mindmap: { label: "AppsFlyer", children: [{ label: "Products", children: [{ label: "Attribution" }, { label: "OneLink" }, { label: "Protect360" }, { label: "ROI360" }] }, { label: "Tech", children: [{ label: "Java/Scala" }, { label: "Kafka + Druid" }, { label: "ML/AI" }] }, { label: "Privacy", children: [{ label: "Privacy Cloud" }, { label: "SKAN Support" }] }] },
    datatable: { columns: ["Metric", "Value"], rows: [["Brands", "12,000+"], ["API calls/day", "100B+"], ["Engineers", "500+"], ["Employees", "1,200"], ["Partners", "10,000+"], ["Market Share", "~70% (top 100)"], ["Founded", "2011"]] },
    infographic: [{ heading: "AppsFlyer", content: "12,000+ brands, 100B+ daily API calls, 10,000+ media partner integrations. Market leader in mobile attribution." }],
    slidedeck: [
      { heading: "AppsFlyer Overview", content: "- Mobile attribution market leader (~70% share)\n- 12,000+ brands, $400M+ revenue\n- 100B+ daily API calls" },
      { heading: "Platform", content: "- Attribution + Deep Linking + Fraud Protection\n- ROI, Audiences, Incrementality, Privacy Cloud\n- 10,000+ integrations\n- Java, Scala, Go, React stack" },
    ],
  },
};

export function getFeaturedContent(slug: string): FeaturedStudioContent | null {
  return contentMap[slug] ?? null;
}
