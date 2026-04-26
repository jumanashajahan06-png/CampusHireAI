/* ============================================================
   controllers/aiController.js  —  Phase 6: Real Claude AI
   
   Uses the Anthropic Claude API to power the career assistant.
   Falls back to smart mock responses if the API key is not set,
   so the app stays fully functional during development.
   ============================================================ */
 
const Anthropic   = require('@anthropic-ai/sdk');
const Application = require('../models/Application');
 
/* ── System prompt: defines Claude's persona ─────────────── */
const SYSTEM_PROMPT = `You are CareerAI, an expert career coach and mentor built into CampusHire AI — a placement and internship tracker for college students.
 
Your role:
- Help students land jobs and internships through actionable, specific advice
- Review resumes, suggest improvements, and tailor them to specific roles
- Generate realistic, role-specific interview questions with strong model answers
- Write compelling cover letters for specific companies and roles
- Provide salary negotiation scripts and strategies
- Give job search tactics: networking, cold outreach, LinkedIn optimization
- Offer encouragement without being sycophantic — be direct, honest, and warm
 
Your style:
- Be concise but complete. Students are busy — respect their time
- Use bullet points and headers for multi-step advice (easier to scan)
- Always make advice specific and actionable, never generic
- When asked for interview questions, give both the question AND a strong sample answer
- When you don't know something (e.g., very recent company news), say so honestly
 
Constraints:
- Stay focused on career, job search, resume, and professional development topics
- If asked something completely unrelated (e.g., math homework), politely redirect
- Never make up specific salary numbers without noting they're estimates
- Keep responses under 600 words unless the student explicitly asks for more detail`;
 
/* ── POST /api/ai/ask ────────────────────────────────────── */
const askAI = async (req, res, next) => {
  try {
    const { messages, context } = req.body;
 
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required'
      });
    }
 
    // Sanitize: only allow role + content fields, valid roles only
    const cleanMessages = messages
      .filter(m => m.role && m.content && ['user', 'assistant'].includes(m.role))
      .map(m => ({
        role:    m.role,
        content: String(m.content).slice(0, 4000) // cap per-message length
      }))
      .slice(-20); // keep last 20 turns to stay within context limits
 
    // Optionally enrich the system prompt with the user's application data
    let enrichedSystem = SYSTEM_PROMPT;
    if (context?.applicationCount !== undefined) {
      enrichedSystem += `\n\nUser context: This student has ${context.applicationCount} applications tracked (${context.statusBreakdown || ''}).`;
    }
 
    // ── Try Anthropic API ────────────────────────────────────
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
      const response = await client.messages.create({
        model:      'claude-opus-4-6',   // Best model for nuanced career advice
        max_tokens: 1024,
        system:     enrichedSystem,
        messages:   cleanMessages,
      });
 
      const reply = response.content[0]?.text || 'Sorry, I could not generate a response.';
 
      return res.json({
        success: true,
        reply,
        source: 'claude' // tells the frontend this is a real AI response
      });
    }
 
    // ── Fallback: smart mock responses ───────────────────────
    // Used when ANTHROPIC_API_KEY is not configured
    const lastUserMessage = cleanMessages.filter(m => m.role === 'user').at(-1)?.content || '';
    const reply = generateMockReply(lastUserMessage);
 
    return res.json({
      success: true,
      reply,
      source: 'mock' // frontend can optionally show a "demo mode" badge
    });
 
  } catch (error) {
    // Handle Anthropic-specific errors gracefully
    if (error.status === 401) {
      return res.status(500).json({
        success: false,
        message: 'AI service authentication failed. Check your ANTHROPIC_API_KEY in .env'
      });
    }
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'AI rate limit reached. Please wait a moment and try again.'
      });
    }
    next(error);
  }
};
 
/* ── POST /api/ai/resume-tips ────────────────────────────── */
// Dedicated endpoint: generate tips based on the user's actual applications
const getResumeTips = async (req, res, next) => {
  try {
    // Fetch user's applications to personalize tips
    const apps = await Application.find({ user: req.user.id })
      .sort('-createdAt')
      .limit(10)
      .lean();
 
    const companies = [...new Set(apps.map(a => a.company))].slice(0, 5).join(', ');
    const roles     = [...new Set(apps.map(a => a.role))].slice(0, 5).join(', ');
 
    const prompt = apps.length > 0
      ? `The student has applied to these companies: ${companies}. Roles they're targeting: ${roles}. Give 5 specific, tailored resume tips to improve their chances at these types of companies. Be concrete — reference the actual company names where relevant.`
      : `Give 5 essential resume tips for a college student applying to tech internships. Be specific and actionable.`;
 
    const messages = [{ role: 'user', content: prompt }];
 
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model:      'claude-opus-4-6',
        max_tokens: 800,
        system:     SYSTEM_PROMPT,
        messages,
      });
 
      return res.json({
        success: true,
        tips: response.content[0]?.text,
        source: 'claude'
      });
    }
 
    // Mock fallback
    return res.json({
      success: true,
      tips: generateResumeTipsMock(companies, roles),
      source: 'mock'
    });
 
  } catch (error) {
    next(error);
  }
};
 
/* ── POST /api/ai/interview-prep ─────────────────────────── */
// Generate interview questions for a specific application
const getInterviewPrep = async (req, res, next) => {
  try {
    const { company, role } = req.body;
 
    if (!company || !role) {
      return res.status(400).json({ success: false, message: 'Company and role are required' });
    }
 
    const prompt = `Generate 8 realistic interview questions for a ${role} position at ${company}. 
Include a mix of:
- 2 behavioural questions (with STAR-method sample answers)
- 3 technical/skills questions relevant to the role
- 2 company-specific questions (based on what you know about ${company})  
- 1 curveball/culture-fit question
 
For each question, provide a strong sample answer.`;
 
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model:      'claude-opus-4-6',
        max_tokens: 1200,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: prompt }],
      });
 
      return res.json({
        success: true,
        questions: response.content[0]?.text,
        source: 'claude'
      });
    }
 
    return res.json({
      success: true,
      questions: generateInterviewMock(company, role),
      source: 'mock'
    });
 
  } catch (error) {
    next(error);
  }
};
 
/* ── Mock helpers (used when API key not configured) ──────── */
 
function generateMockReply(msg) {
  const m = msg.toLowerCase();
 
  if (m.includes('resume') || m.includes('cv'))
    return `Here are **5 high-impact resume tips** for students:\n\n1. **Quantify achievements** — "Built API serving 10k requests/day" beats "worked on backend"\n2. **Strong action verbs** — Led, Shipped, Designed, Reduced, Automated, Grew\n3. **Mirror job descriptions** — Copy exact keywords for ATS screening\n4. **One tight page** — Brevity signals communication skill\n5. **Projects with links** — GitHub/deployed URL > job description bullets\n\n💡 Tip: Tailor your resume for every application — even small tweaks boost response rates significantly.\n\nWould you like tips for a specific company or role?`;
 
  if (m.includes('interview'))
    return `**Interview preparation framework:**\n\n**Behavioural (for every company):**\n- Prepare 6 STAR stories covering: leadership, conflict, failure, achievement, collaboration, initiative\n- "Tell me about yourself" → 90-second Past/Present/Future arc\n\n**Technical (for SWE/data roles):**\n- LeetCode: 2 Easy + 1 Medium daily for 3 weeks before interviews\n- Focus: Arrays, HashMaps, Trees, Two Pointers, Sliding Window\n- System design basics: scalability, databases, caching\n\n**Questions to ask them:**\n- "What does success look like in the first 90 days?"\n- "What's the biggest challenge the team is facing right now?"\n\nWant me to generate specific questions for a company and role?`;
 
  if (m.includes('cover letter'))
    return `**Cover letter structure (keep under 300 words):**\n\n**Paragraph 1 — Hook**\nOpen with a specific observation about the company, not "I am writing to apply for…"\n*Example: "When Stripe launched the Climate API, I spent a weekend building an open-source wrapper for it — that's the kind of developer I am."*\n\n**Paragraph 2 — Why them**\nReference something specific: a product, engineering blog post, value, or mission\n\n**Paragraph 3 — Why you**\nConnect 2-3 specific achievements to their job requirements. Use numbers.\n\n**Paragraph 4 — Close**\nExpress enthusiasm, request a conversation, thank them.\n\nWhich company should I write one for? Share the role and I'll draft a full letter.`;
 
  if (m.includes('salary') || m.includes('negotiat') || m.includes('offer'))
    return `**Salary negotiation playbook:**\n\n**Research first:**\n- Glassdoor, Levels.fyi, LinkedIn Salary, Blind (for tech)\n- Talk to people in your network at that company\n\n**The negotiation:**\n1. Never name a number first — ask "What's the budgeted range?"\n2. Anchor 10-15% above your target\n3. Negotiate base salary, then sign-on, then equity\n4. Get the offer in writing before stopping counter-offers\n\n**Script:**\n*"I'm really excited about this role — it's my top choice. Based on my research and experience, I was hoping for around [X]. Is there flexibility there?"*\n\n**For internships:**\nStipend negotiation is less common but possible at startups. Benefits (housing, travel) are often easier to negotiate.\n\nWhat's the specific offer and company? I can give more targeted advice.`;
 
  if (m.includes('linkedin') || m.includes('network'))
    return `**LinkedIn + networking tips that actually work:**\n\n**Profile optimisation:**\n- Headline: "CS @ MIT | SWE Intern @ Stripe | Open to Summer 2026 roles"\n- About section: 3-4 sentences, first person, specific projects and skills\n- Featured section: Pin your best project, GitHub, or portfolio\n\n**Outreach that gets replies (cold messages):**\n1. Find a 2nd-degree connection at your target company\n2. Message: "Hi [Name], I'm a CS student at [Uni] applying to [Role] at [Company]. I saw you work on [specific team] — would you be open to a 15-min chat? Happy to share my resume."\n3. Personalise every message — reference their actual work\n\n**Key stat:** Referrals are 3-4x more likely to get interviews. Prioritise warm outreach over applications.`;
 
  return `I'm your **AI Career Coach** — here to help you land your next role! 🎯\n\nI can help with:\n- 📄 **Resume** reviews and rewrites\n- 💬 **Interview prep** with role-specific questions\n- ✉️ **Cover letters** tailored to specific companies\n- 💰 **Salary negotiation** scripts and strategies\n- 🔗 **LinkedIn** optimisation and networking outreach\n- 🎯 **Job search** strategy and prioritisation\n\nWhat are you working on? Tell me the company and role for the most specific advice.`;
}
 
function generateResumeTipsMock(companies, roles) {
  return `**Tailored resume tips for your job search:**\n\n1. **Lead with impact numbers** — Quantify every bullet. "Built REST API" → "Built REST API handling 50k+ daily requests"\n2. **Skills alignment** — For companies like ${companies || 'your targets'}, highlight system design, scalability, and any open-source contributions\n3. **Project descriptions** — Each project needs: what it does, tech stack, your specific role, and a link\n4. **Education placement** — If GPA ≥ 3.5, show it prominently. If not, deprioritise it\n5. **Consistency** — Every bullet: past tense, action verb, object, result. Scan for any deviations\n\n💡 For roles like ${roles || 'your target roles'}, recruiters spend an average of 7 seconds on a first pass. Your top third of the page must immediately signal "strong candidate."`;
}
 
function generateInterviewMock(company, role) {
  return `**Interview questions for ${role} at ${company}:**\n\n**Behavioural:**\n1. "Tell me about a project where you had to learn a new technology quickly. How did you approach it?"\n   *Strong answer: Use STAR — describe the constraint, your learning strategy, what you built, and the result.*\n\n2. "Describe a time you disagreed with a teammate. How did you resolve it?"\n   *Strong answer: Show you can hold your ground respectfully and prioritise the team's outcome over ego.*\n\n**Technical:**\n3. "Walk me through how you'd design a URL shortener like bit.ly."\n4. "What's the difference between a process and a thread? When would you use each?"\n5. "How would you debug a production issue where one API endpoint is suddenly 10x slower?"\n\n**${company}-specific:**\n6. "Why ${company} specifically? What product or engineering decision impressed you?"\n7. "Where do you see ${company}'s biggest technical challenge in the next 2 years?"\n\n**Culture fit:**\n8. "What's a side project you've worked on purely out of curiosity — with no grade or deadline?"\n\n💡 Spend 60% of prep time on questions 1-2. Behavioural questions trip up more candidates than technical ones.`;
}
 
module.exports = { askAI, getResumeTips, getInterviewPrep };