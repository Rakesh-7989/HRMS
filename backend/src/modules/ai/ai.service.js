const pool = require("../../config/db");

const getQuery = (db) => {
    if (db && typeof db.query === "function") return (text, params) => db.query(text, params);
    return pool.query.bind(pool);
};

exports.getInsights = async (db, tenantId) => {
    const query = getQuery(db);
    const res = await query(
        `SELECT insight_type AS type, title, description, severity, affected_count, metadata->>'recommendation' AS recommendation
         FROM ai_insights WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
    );
    return res.rows.map(r => ({
        ...r,
        confidence: 0.85,
        severity: r.severity ? r.severity.toLowerCase() : 'low'
    }));
};

exports.parseResume = async (db, tenantId, userId, fileInfo) => {
    const resumeText = "Parsed resume content";
    return {
        name: "Candidate Name",
        email: "candidate@example.com",
        phone: "+1-234-567-8900",
        skills: ["JavaScript", "React", "Node.js", "Python", "SQL"],
        experience_years: 5,
        education: [
            { degree: "B.Tech Computer Science", institution: "University", year: 2019 }
        ],
        work_experience: [
            { company: "Tech Corp", role: "Senior Developer", duration: "2021-2025", highlights: ["Led team of 5", "Built microservices"] }
        ],
        certifications: ["AWS Certified", "Google Cloud"]
    };
};

exports.analyzeSentiment = async (db, tenantId, surveyId) => {
    return {
        overall_score: 7.5,
        trend: 'improving',
        categories: [
            { name: "Work Environment", score: 8.0, volume: 45 },
            { name: "Management", score: 7.0, volume: 42 },
            { name: "Growth", score: 6.5, volume: 38 }
        ],
        top_positive_keywords: ["collaborative", "flexible", "supportive"],
        top_negative_keywords: ["workload", "communication"]
    };
};

exports.getSkillGaps = async (db, tenantId, employeeId, roleId) => {
    return [
        { skill: "TypeScript", current_level: 3, required_level: 4, gap: 1, priority: "medium", suggestions: ["Advanced TypeScript course", "Practice with generics"] },
        { skill: "Docker", current_level: 2, required_level: 4, gap: 2, priority: "high", suggestions: ["Docker certification", "Containerize existing apps"] },
        { skill: "System Design", current_level: 3, required_level: 5, gap: 2, priority: "high", suggestions: ["System design interview prep", "Design distributed systems"] },
        { skill: "GraphQL", current_level: 1, required_level: 3, gap: 2, priority: "medium", suggestions: ["GraphQL fundamentals", "Build a GraphQL API"] }
    ];
};

exports.generateContent = async (db, tenantId, userId, prompt, context) => {
    return {
        content: `Generated content based on: "${prompt}". ${context ? `Context: ${context}` : ''}`
    };
};

exports.chat = async (db, tenantId, userId, message, history) => {
    return {
        response: `Response to: "${message}". I'm an AI assistant for HRMS. How can I help you further?`,
        suggestions: ["Show me performance reviews", "Analyze employee sentiment", "Generate a report"]
    };
};

exports.matchCandidates = async (db, tenantId, jobId) => {
    return [
        { candidate_id: "00000000-0000-0000-0000-000000000001", score: 92, strengths: ["React", "Node.js", "System Design"], gaps: ["Docker", "Kubernetes"] },
        { candidate_id: "00000000-0000-0000-0000-000000000002", score: 78, strengths: ["Python", "Machine Learning"], gaps: ["Frontend", "DevOps"] },
        { candidate_id: "00000000-0000-0000-0000-000000000003", score: 65, strengths: ["Project Management", "Agile"], gaps: ["Technical Skills"] }
    ];
};
