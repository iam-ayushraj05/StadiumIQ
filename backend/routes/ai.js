/**
 * AI Route — StadiumIQ GenAI Endpoints
 * Handles all Gemini AI interactions: chat, translation, recommendations
 */

import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsPath = path.join(__dirname, '..', 'data', 'stadium_documents.json');

let stadiumDocs = [];
try {
  stadiumDocs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
} catch (err) {
  console.error('Error reading stadium documents:', err.message);
}

function retrieveDocuments(query, maxResults = 2) {
  if (!query) return [];
  const queryTokens = query.toLowerCase().split(/[\s,.\-!?()'"\n]+/);
  const scored = stadiumDocs.map(doc => {
    let score = 0;
    doc.keywords.forEach(kw => {
      queryTokens.forEach(token => {
        if (token === kw || (token.length > 3 && kw.includes(token)) || (kw.length > 3 && token.includes(kw))) {
          score += 1;
        }
      });
    });
    return { doc, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.doc);
}

// ─── Gemini Client Factory ──────────────────────────────────────────────────
function getGeminiClient(apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key is required.');
  return new GoogleGenerativeAI(key);
}

// ─── Stadium Context System Prompt ──────────────────────────────────────────
function buildSystemPrompt(role, stadium, language) {
  const stadiums = {
    nrg: { name: 'NRG Stadium', city: 'Houston, TX', capacity: 72220 },
    sofi: { name: 'SoFi Stadium', city: 'Inglewood, CA', capacity: 70240 },
    metlife: { name: 'MetLife Stadium', city: 'East Rutherford, NJ', capacity: 82500 },
    att: { name: 'AT&T Stadium', city: 'Arlington, TX', capacity: 80000 },
    arrowhead: { name: 'Arrowhead Stadium', city: 'Kansas City, MO', capacity: 76416 },
    lincoln: { name: 'Lincoln Financial Field', city: 'Philadelphia, PA', capacity: 69796 },
    levis: { name: "Levi's Stadium", city: 'Santa Clara, CA', capacity: 68500 },
    bmo: { name: 'BMO Field', city: 'Toronto, Canada', capacity: 30000 }
  };

  const venueInfo = stadiums[stadium] || stadiums.nrg;
  const langInstructions = language !== 'en'
    ? `IMPORTANT: Always respond in the requested language (${language}). If the user writes in any language, respond in ${language}.`
    : '';

  // Tone and authorization rules based on user role
  let roleRule = '';
  if (role === 'staff' || role === 'volunteer' || role === 'organizer') {
    roleRule = `ROLE AUTHORIZATION: STAFF/OPERATIONAL ACCESS. 
- Tone: Professional, tactical, operational, and direct.
- Permissions: You are allowed to disclose internal staff assignments, medical stand-by sectors, active incident tickets (e.g. wet floor at Section 102, trash collection alert at Food Court A), and security level protocols. 
- Prompting helper: If asked about schedules or incidents, mention that dispatchers are monitoring.`;
  } else {
    roleRule = `ROLE AUTHORIZATION: GENERAL FAN / VISITOR ACCESS.
- Tone: Welcoming, enthusiastic, helpful, and friendly.
- Permissions: ONLY discuss public stadium facilities, concession locations, transport links, accessibility routes, and stadium policies. Do NOT discuss internal staff shifts, active operations incidents, or detailed security guard coordinates.`;
  }

  // Cross-reference data points from other tabs for live consistency
  const liveStadiumState = `
[LIVE STADIUM SENSOR CONTEXT]:
- Overall Occupancy: 94% full (approx. 68,000+ fans inside)
- High Congestion Areas: Food Court A is currently busy at 51% capacity. Main Entrance A is also busy at 51%. Suggest Food Court B (41% occupancy) or Merchandise Hub (40%) to avoid lines.
- Active Traffic Alert: Gate C is experiencing a bottleneck. Re-routing is recommended.
- Transit Status: North Garage is at 92% occupancy (only 223 parking spots remaining). Stadium Shuttles are running every 8 minutes. BMO/B-Cycle bikes are available on-demand with 13 bikes at the terminal.
- Sustainability Profile: 23% of stadium energy is powered by active solar panels. The current recycling rate is 64% (3.1 tonnes composted/recycled). 30% of total water is greywater recycled.
`;

  return `You are StadiumIQ, an advanced Generative AI assistant deployed at ${venueInfo.name} (${venueInfo.city}, capacity: ${venueInfo.capacity.toLocaleString()}) for the FIFA World Cup 2026.

${roleRule}

${liveStadiumState}

Your capabilities:
- Real-time crowd density information and safe route recommendations
- Indoor navigation assistance with accessibility options
- Transport schedules, parking, and shuttle information  
- Food, beverage, and merchandise locations
- Medical and emergency service locations
- Stadium rules, regulations, and security policies
- Live match schedules and team information
- Multilingual support across 32 languages
- Sustainability and eco-friendly choices
- Volunteer coordination and staff operations

Always be:
- Helpful, concise, and accurate
- Safety-conscious (always mention emergency exits/services when relevant)
- Inclusive (consider accessibility needs)
- Proactive (anticipate follow-up questions)

${langInstructions}

When asked about crowd density, navigation, or transport — provide specific, actionable guidance based on the venue and the [LIVE STADIUM SENSOR CONTEXT] above. Use emojis strategically for clarity.`;
}

// ─── POST /api/ai/chat ───────────────────────────────────────────────────────
// Mock Backend Tools for Gemini Agentic Workflow
const tools = {
  get_next_shuttle_time: (location) => {
    const loc = String(location || '').toLowerCase();
    if (loc.includes('gate b') || loc.includes('north')) {
      return { service: 'North Shuttle Loop', time: '3 minutes', status: 'On Time', capacity: '42% full', terminal: 'Gate B Bay 1' };
    } else if (loc.includes('gate a') || loc.includes('main')) {
      return { service: 'Main Shuttle Loop', time: '7 minutes', status: 'On Time', capacity: '78% full', terminal: 'Gate A Bay 2' };
    } else {
      return { service: 'All Shuttle Loops', time: '5-8 minutes average frequency', status: 'Active', capacity: 'Nominal', terminal: 'Active bays at Gates A & B' };
    }
  },
  get_parking_availability: (garage) => {
    const gar = String(garage || '').toLowerCase();
    if (gar.includes('north')) {
      return { name: 'North Parking Garage', totalSpaces: 2500, occupiedSpaces: 2277, availableSpaces: 223, occupancyRate: '92%' };
    } else {
      return { name: 'South & East Lots', totalSpaces: 5000, occupiedSpaces: 2250, availableSpaces: 2750, occupancyRate: '45%' };
    }
  },
  get_concession_status: (food_court) => {
    const court = String(food_court || '').toLowerCase();
    if (court.includes('food court a') || court.includes('a')) {
      return { name: 'Food Court A', occupancyRate: '51%', status: 'Congested', averageWaitTime: '14 minutes', closedVendors: ['Window 4 (cleaning)'] };
    } else {
      return { name: 'Food Court B', occupancyRate: '41%', status: 'Nominal', averageWaitTime: '6 minutes', closedVendors: [] };
    }
  },
  get_active_operations_incidents: () => {
    return { activeCount: 2, criticalAlerts: 1, recentTypes: ['crowd', 'medical'], status: 'Action recommended for Gate C bottleneck.' };
  },
  get_emergency_exits_status: () => {
    return { exitsClear: true, crowdMarshalDeployment: 'All zones active', activeEvacuationRoutes: ['Route Alpha (North)', 'Route Beta (South)'] };
  }
};

function classifyIntentFallback(msg) {
  const m = msg.toLowerCase();
  if (m.includes('shuttle') || m.includes('bus') || m.includes('parking') || m.includes('garage') || m.includes('transit') || m.includes('transport')) {
    return 'transportation';
  }
  if (m.includes('navigate') || m.includes('go to') || m.includes('where is') || m.includes('find') || m.includes('direction') || m.includes('gate') || m.includes('section')) {
    return 'navigation';
  }
  if (m.includes('incident') || m.includes('staff') || m.includes('volunteer') || m.includes('ops') || m.includes('organizer') || m.includes('dispatched')) {
    return 'operations';
  }
  if (m.includes('medical') || m.includes('emergency') || m.includes('hurt') || m.includes('exit') || m.includes('first aid') || m.includes('safety')) {
    return 'emergency';
  }
  return 'general';
}

router.post('/chat', async (req, res) => {
  const { message, apiKey, stadium = 'nrg', role = 'fan', language = 'en', history = [], temperature = 0.7 } = req.body;

  const validStadiums = ['nrg', 'sofi', 'metlife', 'att', 'arrowhead', 'lincoln', 'levis', 'bmo'];
  const validRoles = ['fan', 'staff', 'volunteer', 'organizer'];
  const validLanguages = ['en', 'es', 'fr', 'ar', 'pt', 'zh', 'hi', 'de', 'it', 'ja', 'ko', 'ru', 'nl', 'pl', 'tr', 'sv'];

  const cleanStadium = validStadiums.includes(stadium) ? stadium : 'nrg';
  const cleanRole = validRoles.includes(role) ? role : 'fan';
  const cleanLanguage = validLanguages.includes(language) ? language : 'en';
  const cleanTemp = Math.max(0, Math.min(1, parseFloat(temperature) || 0.7));

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (message.length > 500) {
    return res.status(400).json({ error: 'Message exceeds 500 character limit.' });
  }

  let intent = 'general';
  let executionSteps = [];
  let toolExecuted = null;
  let toolOutputText = '';

  // Step 0: RAG (Retrieval-Augmented Generation) Pipeline
  const retrievedDocs = retrieveDocuments(message, 2);
  let ragContextText = '';
  if (retrievedDocs.length > 0) {
    ragContextText = retrievedDocs.map(doc => `[OFFICIAL ${doc.title}]: ${doc.content}`).join('\n\n');
    executionSteps.push(`🔍 RAG Pipeline: Retrieved ${retrievedDocs.length} matching official guidelines`);
    retrievedDocs.forEach(doc => {
      executionSteps.push(`📄 Referenced: "${doc.title}"`);
    });
  } else {
    executionSteps.push(`🔍 RAG Pipeline: No matching official stadium guidelines found.`);
  }

  // Step 1: Routing Agent (Intent Classification)
  try {
    const genAI = getGeminiClient(apiKey);
    const classificationModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const classPrompt = `You are the primary Routing Agent for StadiumIQ. Classify the user query into exactly one of these categories: "transportation", "navigation", "operations", "emergency", "general".
Respond with ONLY the category word in lowercase.
Query: "${message}"`;
    const classResult = await classificationModel.generateContent(classPrompt);
    intent = classResult.response.text().trim().toLowerCase();
    executionSteps.push(`🕵️ Routing Agent: Classified query intent as "${intent.toUpperCase()}" via Gemini`);
  } catch (e) {
    intent = classifyIntentFallback(message);
    executionSteps.push(`🕵️ Routing Agent: Classified query intent as "${intent.toUpperCase()}" via Fallback Rules`);
  }

  // Step 2: Tool Execution (Function Calling)
  const lowerMsg = message.toLowerCase();
  if (intent === 'transportation') {
    if (lowerMsg.includes('shuttle') || lowerMsg.includes('bus') || lowerMsg.includes('next')) {
      const location = lowerMsg.includes('gate b') ? 'Gate B' : (lowerMsg.includes('gate a') ? 'Gate A' : 'General');
      const data = tools.get_next_shuttle_time(location);
      toolExecuted = 'get_next_shuttle_time';
      toolOutputText = JSON.stringify(data);
      executionSteps.push(`🛠️ Tool Invoked: get_next_shuttle_time({ location: "${location}" })`);
      executionSteps.push(`📦 Tool Output: Next Shuttle at ${location} in ${data.time} (${data.capacity})`);
    } else if (lowerMsg.includes('parking') || lowerMsg.includes('garage') || lowerMsg.includes('space')) {
      const garage = lowerMsg.includes('north') ? 'North' : 'General';
      const data = tools.get_parking_availability(garage);
      toolExecuted = 'get_parking_availability';
      toolOutputText = JSON.stringify(data);
      executionSteps.push(`🛠️ Tool Invoked: get_parking_availability({ garage: "${garage}" })`);
      executionSteps.push(`📦 Tool Output: ${data.name} occupancy is ${data.occupancyRate} (${data.availableSpaces} spots left)`);
    }
  } else if (lowerMsg.includes('food') || lowerMsg.includes('concession') || lowerMsg.includes('eat') || lowerMsg.includes('court') || lowerMsg.includes('queue')) {
    const court = lowerMsg.includes('court a') || lowerMsg.includes('food court a') ? 'Food Court A' : 'Food Court B';
    const data = tools.get_concession_status(court);
    toolExecuted = 'get_concession_status';
    toolOutputText = JSON.stringify(data);
    executionSteps.push(`🛠️ Tool Invoked: get_concession_status({ food_court: "${court}" })`);
    executionSteps.push(`📦 Tool Output: ${data.name} wait time is ${data.averageWaitTime} (${data.occupancyRate} full)`);
  } else if (intent === 'operations' && (role === 'staff' || role === 'volunteer' || role === 'organizer')) {
    const data = tools.get_active_operations_incidents();
    toolExecuted = 'get_active_operations_incidents';
    toolOutputText = JSON.stringify(data);
    executionSteps.push(`🛠️ Tool Invoked: get_active_operations_incidents()`);
    executionSteps.push(`📦 Tool Output: ${data.activeCount} active incidents (${data.status})`);
  } else if (intent === 'emergency' || lowerMsg.includes('exit') || lowerMsg.includes('medical') || lowerMsg.includes('hurt') || lowerMsg.includes('first aid')) {
    const data = tools.get_emergency_exits_status();
    toolExecuted = 'get_emergency_exits_status';
    toolOutputText = JSON.stringify(data);
    executionSteps.push(`🛠️ Tool Invoked: get_emergency_exits_status()`);
    executionSteps.push(`📦 Tool Output: All exits clear: ${data.exitsClear}`);
  }

  if (!toolExecuted) {
    executionSteps.push(`ℹ️ No tool execution required for this query.`);
  } else {
    executionSteps.push(`🤖 Feeding tool results back to Gemini for precise response construction`);
  }

  try {
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{
        functionDeclarations: [
          {
            name: 'get_next_shuttle_time',
            description: 'Get the next shuttle departure time for a specific gate or terminal.',
            parameters: {
              type: 'OBJECT',
              properties: {
                location: { type: 'STRING', description: 'The gate name or terminal location (e.g., Gate A, Gate B).' }
              },
              required: ['location']
            }
          },
          {
            name: 'get_parking_availability',
            description: 'Get available spaces and occupancy rate for a parking garage.',
            parameters: {
              type: 'OBJECT',
              properties: {
                garage: { type: 'STRING', description: 'The parking garage name (e.g., North, South).' }
              },
              required: ['garage']
            }
          },
          {
            name: 'get_concession_status',
            description: 'Get current occupancy, queue wait time, and status of a concessions area.',
            parameters: {
              type: 'OBJECT',
              properties: {
                food_court: { type: 'STRING', description: 'The food court name (e.g., Food Court A, Food Court B).' }
              },
              required: ['food_court']
            }
          },
          {
            name: 'get_active_operations_incidents',
            description: 'Get the count of active operations incidents and current safety alert state.',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          },
          {
            name: 'get_emergency_exits_status',
            description: 'Get status of emergency exit gates and active evacuation paths.',
            parameters: {
              type: 'OBJECT',
              properties: {}
            }
          }
        ]
      }],
      systemInstruction: buildSystemPrompt(cleanRole, cleanStadium, cleanLanguage)
    });

    // Convert history format for Gemini
    const chatHistory = (history || []).slice(-10).map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: cleanTemp,
        maxOutputTokens: 1024,
        topP: 0.9,
        topK: 40
      }
    });

    let finalMessage = message;
    if (ragContextText) {
      finalMessage = `[RETRIEVED OFFICIAL CONTEXT]\n${ragContextText}\n\nUser Query: ${message}\nIMPORTANT: Answer the user's query utilizing the retrieved official context above. State clearly that this is based on official FIFA World Cup 2026 / stadium guidelines.`;
    }

    let result = await chat.sendMessage(finalMessage);
    let response = '';

    // Check if Gemini requested a function call
    const functionCalls = result.response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const toolName = call.name;
      const args = call.args || {};
      
      executionSteps.push(`🕵️ Agentic Routing: Gemini model requested tool "${toolName}"`);
      
      let localResult = {};
      if (toolName === 'get_next_shuttle_time') {
        localResult = tools.get_next_shuttle_time(args.location || 'General');
        toolExecuted = 'get_next_shuttle_time';
      } else if (toolName === 'get_parking_availability') {
        localResult = tools.get_parking_availability(args.garage || 'General');
        toolExecuted = 'get_parking_availability';
      } else if (toolName === 'get_concession_status') {
        localResult = tools.get_concession_status(args.food_court || 'Food Court A');
        toolExecuted = 'get_concession_status';
      } else if (toolName === 'get_active_operations_incidents') {
        localResult = tools.get_active_operations_incidents();
        toolExecuted = 'get_active_operations_incidents';
      } else if (toolName === 'get_emergency_exits_status') {
        localResult = tools.get_emergency_exits_status();
        toolExecuted = 'get_emergency_exits_status';
      }

      executionSteps.push(`🛠️ Tool Invoked: ${toolName}(${JSON.stringify(args)})`);
      executionSteps.push(`📦 Tool Output: ${JSON.stringify(localResult)}`);
      
      // Feed response back to model
      const followUp = await chat.sendMessage([{
        functionResponse: {
          name: toolName,
          response: { result: localResult }
        }
      }]);
      response = followUp.response.text();
      executionSteps.push(`🤖 Feeding tool results back to Gemini for precise response construction`);
    } else {
      response = result.response.text();
    }

    // Estimate tokens (rough: 4 chars/token)
    const estimatedTokens = Math.ceil((message.length + response.length) / 4);

    return res.json({
      response,
      tokensUsed: estimatedTokens,
      model: 'gemini-1.5-flash',
      agentExecution: {
        intent,
        toolCalled: toolExecuted,
        steps: executionSteps
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[AI Chat Error]', err.message);

    const isApiKeyError = err.message?.includes('API key') || err.message?.includes('required');
    if (isApiKeyError) {
      // Create a high-quality fallback reply based on tool execution
      let fallbackResponse = '';
      if (toolExecuted === 'get_next_shuttle_time') {
        const parsed = JSON.parse(toolOutputText);
        fallbackResponse = `🤖 **StadiumIQ AI Agent (Demo Mode — Local Tool Call):**\n\nThe next shuttle from **${parsed.terminal}** departs in **${parsed.time}** (${parsed.service}, current capacity is **${parsed.capacity}**). All services are running **${parsed.status}**.`;
      } else if (toolExecuted === 'get_parking_availability') {
        const parsed = JSON.parse(toolOutputText);
        fallbackResponse = `🤖 **StadiumIQ AI Agent (Demo Mode — Local Tool Call):**\n\nCurrently, **${parsed.name}** has **${parsed.availableSpaces}** spots remaining (**${parsed.occupancyRate}** occupied out of ${parsed.totalSpaces} total). We recommend choosing alternative parking or arriving early.`;
      } else if (toolExecuted === 'get_concession_status') {
        const parsed = JSON.parse(toolOutputText);
        fallbackResponse = `🤖 **StadiumIQ AI Agent (Demo Mode — Local Tool Call):**\n\n**${parsed.name}** is currently at **${parsed.occupancyRate}** occupancy with an average wait time of **${parsed.averageWaitTime}**. ${parsed.closedVendors.length ? 'Note: ' + parsed.closedVendors.join(', ') + ' is closed.' : 'All vendors are open.'}`;
      } else if (toolExecuted === 'get_active_operations_incidents') {
        const parsed = JSON.parse(toolOutputText);
        fallbackResponse = `🤖 **StadiumIQ AI Agent (Demo Mode — Local Tool Call):**\n\nThere are currently **${parsed.activeCount}** active operational alerts on file. Specific status: *${parsed.status}*`;
      } else if (toolExecuted === 'get_emergency_exits_status') {
        const parsed = JSON.parse(toolOutputText);
        fallbackResponse = `🚨 **StadiumIQ AI Agent (Demo Mode — Local Tool Call):**\n\nAll emergency exit gates are reported **CLEAR**. Evacuation routes active: **${parsed.activeEvacuationRoutes.join(', ')}**. Crowd marshall staffing is fully deployed.`;
      } else if (retrievedDocs.length > 0) {
        const primaryDoc = retrievedDocs[0];
        fallbackResponse = `📖 **StadiumIQ AI Agent (Demo Mode — RAG Retrieval):**\n\nBased on official stadium spectator guidelines:\n\n**${primaryDoc.title}**\n${primaryDoc.content}\n\n*Source: Official FIFA World Cup 2026 Spectator Policy / NRG Stadium Guide.*`;
      } else if (role === 'organizer' || message.includes('volunteers dispatched') || message.includes('operational task cards')) {
        // Parse the target sector and task objective if possible
        const sectorMatch = message.match(/dispatched to (.*?) for a/);
        const sector = sectorMatch ? sectorMatch[1] : 'Gate A';
        const taskMatch = message.match(/for a (.*?) task/);
        const rawTask = taskMatch ? taskMatch[1] : 'Crowd Redirection & Flow Management';
        
        // Pretty formatting for task names
        const taskLabels = {
          crowd_redirect: 'Crowd Redirection & Flow Management',
          medical_assist: 'Medical Assistance Dispatch',
          debris_cleanup: 'Eco/Debris Collection Dispatch',
          accessibility_escort: 'Accessibility Escort Assist',
          security_standby: 'Security Standby Reinforcement'
        };
        const taskType = taskLabels[rawTask] || rawTask;
        
        fallbackResponse = `📋 **StadiumIQ AI Operations Agent (Demo Mode):**

**🎯 PRIMARY OBJECTIVE:**
Deploy to **${sector}** to assist with **${taskType}** operations and maintain safe passenger flow.

**📍 SPECIFIC SECTOR COORDINATES:**
${sector} Main Entrance portals, ramp areas, and adjacent access corridors.

**🛠️ REQUIRED EQUIPMENT & MATERIALS:**
- High-visibility safety vests
- Directional megaphones & digital map displays
- Emergency exit route cards

**📋 ACTIONABLE PROCEDURES:**
1. Position volunteer teams at key decision points to guide fans.
2. Monitor density levels and request supervisor support if crowd bottlenecks form.
3. Coordinate with transit dispatchers to align shuttle departures with peak egress.`;
      } else if (intent === 'navigation') {
        fallbackResponse = `🤖 **StadiumIQ AI Agent (Demo Mode — Spatial Routing):**\n\nTo reach **Gate A** from your current location:\n1. Head North along the **East Concourse Corridor**.\n2. Pass the **Food Court A** on your right.\n3. Take the escalators to the ground floor; **Gate A** will be directly ahead.\n\n*Estimated Travel Time: 6 minutes. Accessibility route available via Elevators 2 & 3.*`;
      } else if (intent === 'transportation') {
        fallbackResponse = `🚌 **StadiumIQ AI Agent (Demo Mode — Transport Hub):**\n\nShuttles to **Downtown Houston** depart every 5 minutes from **Gate B Bay 1**. Metro services are running with normal frequency (4-minute wait times). Currently, **North Parking Garage** has limited space (92% full).`;
      } else if (intent === 'emergency') {
        fallbackResponse = `🚨 **StadiumIQ AI Agent (Demo Mode — Emergency Response):**\n\nAll emergency exit gates are reported **CLEAR**. Nearest medical station is located at **Section 112** (Level 1). Evacuation routes Alpha and Beta are fully operational. Staff have been alerted.`;
      } else {
        fallbackResponse = `👋 **StadiumIQ AI Agent (Demo Mode):**\n\nI classified your query intent as **"${intent.toUpperCase()}"**.\n\nTo activate live Gemini responses, please enter your Gemini API Key in the settings sidebar!`;
      }

      return res.json({
        response: fallbackResponse,
        tokensUsed: 45,
        model: 'local-agentic-classifier',
        agentExecution: {
          intent,
          toolCalled: toolExecuted,
          steps: executionSteps
        },
        timestamp: new Date().toISOString()
      });
    }

    if (err.message?.includes('quota') || err.message?.includes('429')) {
      return res.status(429).json({ error: 'Gemini API quota exceeded. Please try again later.' });
    }

    return res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// ─── POST /api/ai/translate ──────────────────────────────────────────────────
router.post('/translate', async (req, res) => {
  const { text, targetLanguage, apiKey } = req.body;

  if (!text || !targetLanguage || typeof text !== 'string' || typeof targetLanguage !== 'string') {
    return res.status(400).json({ error: 'text and targetLanguage must be valid strings.' });
  }

  if (text.length > 2000) {
    return res.status(400).json({ error: 'Text exceeds 2000 character limit.' });
  }

  const languageNames = {
    en: 'English', es: 'Spanish', fr: 'French', ar: 'Arabic',
    pt: 'Portuguese', zh: 'Mandarin Chinese', hi: 'Hindi', de: 'German',
    it: 'Italian', ja: 'Japanese', ko: 'Korean', ru: 'Russian',
    nl: 'Dutch', pl: 'Polish', tr: 'Turkish', sv: 'Swedish'
  };

  if (!languageNames[targetLanguage]) {
    return res.status(400).json({ error: 'Unsupported target language.' });
  }

  const langName = languageNames[targetLanguage];

  try {
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Translate the following text to ${langName}. Return ONLY the translated text, no explanations or quotation marks:\n\n${text}`;
    const result = await model.generateContent(prompt);
    const translated = result.response.text().trim();

    return res.json({
      original: text,
      translated,
      targetLanguage,
      languageName: langName,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Translate Error]', err.message);
    return res.status(500).json({ error: 'Translation service unavailable.' });
  }
});

// ─── POST /api/ai/crowd-analysis ─────────────────────────────────────────────
router.post('/crowd-analysis', async (req, res) => {
  const { crowdData, apiKey } = req.body;

  try {
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a crowd safety AI analyst for FIFA World Cup 2026 at NRG Stadium.

Analyze the following crowd density data and provide 3-4 specific, actionable recommendations for venue operations staff.
Format each recommendation with an emoji, title, and brief description (max 2 sentences).

Crowd Data:
${JSON.stringify(crowdData, null, 2)}

Respond as a JSON array with this structure:
[{"emoji": "...", "title": "...", "description": "...", "priority": "high|medium|low"}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return res.json({ recommendations, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error('[Crowd Analysis Error]', err.message);
    // Return fallback recommendations
    return res.json({
      recommendations: [
        { emoji: '🚦', title: 'Redirect Gate C Traffic', description: 'Open auxiliary gates to reduce bottleneck.', priority: 'high' },
        { emoji: '🍔', title: 'Open Pop-up Food Stalls', description: 'Deploy mobile vendors at sections 112-115 to reduce food court congestion.', priority: 'medium' },
        { emoji: '🚌', title: 'Increase Shuttle Frequency', description: 'Add 3 additional shuttle buses on the North Route.', priority: 'medium' }
      ],
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

// ─── POST /api/ai/route-description ──────────────────────────────────────────
router.post('/route-description', async (req, res) => {
  const { from, to, preferences, apiKey } = req.body;

  try {
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prefList = Object.entries(preferences || {})
      .filter(([, v]) => v)
      .map(([k]) => k).join(', ') || 'standard';

    const prompt = `Generate a clear, step-by-step navigation description for stadium visitors at FIFA World Cup 2026.

From: ${from}
To: ${to}  
Route preferences: ${prefList}

Provide exactly 5 navigation steps. Each step should be practical and include landmarks.
Format as JSON array: [{"step": 1, "instruction": "...", "landmark": "...", "distance": "..."}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const steps = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const fallbackTime = preferences?.shortestPath ? 5 : preferences?.avoidCrowds ? 9 : 7;

    return res.json({
      steps,
      estimatedTime: `${fallbackTime} min`,
      distance: `${(fallbackTime * 80).toLocaleString()} m`,
      accessibility: preferences?.accessibleRoute || false,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Route Error]', err.message);
    return res.json({
      steps: [
        { step: 1, instruction: 'Exit through the main lobby doors', landmark: 'Near ticket scanners', distance: '50m' },
        { step: 2, instruction: 'Turn right at the concourse junction', landmark: 'Past the merchandise store', distance: '120m' },
        { step: 3, instruction: 'Take elevator or ramp to Level 2', landmark: 'Next to restrooms', distance: '30m' },
        { step: 4, instruction: 'Follow the blue floor arrows towards Section 114', landmark: 'Past food court B', distance: '200m' },
        { step: 5, instruction: 'Enter through gate 114-F', landmark: 'Your seat is in Row F, Seat 12', distance: '20m' }
      ],
      estimatedTime: '7 min',
      distance: '420m',
      accessibility: false,
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

// ─── POST /api/ai/sustainability-report ──────────────────────────────────────
router.post('/sustainability-report', async (req, res) => {
  const { ecoData, apiKey } = req.body;

  try {
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a sustainability AI advisor for FIFA World Cup 2026. 

Based on the following venue eco-metrics, generate 4 actionable sustainability recommendations.
Return as JSON array: [{"emoji":"...","title":"...","impact":"...","action":"...","category":"energy|waste|water|transport"}]

Metrics:
${JSON.stringify(ecoData, null, 2)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return res.json({ recommendations, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error('[Sustainability Error]', err.message);
    return res.json({
      recommendations: [
        { emoji: '⚡', title: 'Switch to LED Lighting Zone C', impact: 'Save 2.1 MWh', action: 'Contact facilities at ext. 4102', category: 'energy' },
        { emoji: '♻️', title: 'Increase Recycling Bin Coverage', impact: 'Reduce waste by 18%', action: 'Deploy 40 more sorting bins', category: 'waste' },
        { emoji: '💧', title: 'Enable Greywater Recycling', impact: 'Save 45,000L today', action: 'Activate backup water recovery system', category: 'water' },
        { emoji: '🚌', title: 'Promote Shuttle Ridership', impact: 'Avoid 890kg CO₂', action: 'Push shuttle notifications to 12,000 fans', category: 'transport' }
      ],
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

// ─── GET /api/ai/models ───────────────────────────────────────────────────────
router.get('/models', (_req, res) => {
  res.json({
    available: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast, efficient — best for real-time chat', recommended: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Advanced reasoning — best for complex analysis' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Latest model — experimental multimodal' }
    ]
  });
});

export default router;
