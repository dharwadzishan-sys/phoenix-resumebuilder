import { NextResponse } from 'next/server';
import groq from '@/lib/groqClient';

export async function POST(req: Request) {
  try {
    const { targetRole, experience } = await req.json();

    const prompt = `You are a career counselor and technical mentor.
Generate a structured study plan for a ${targetRole} with ${experience} experience.
We need exactly 3 to 4 core modules that the candidate should master to ace their interview.

CRITICAL INSTRUCTION: Return the output STRICTLY as a JSON object wrapping an array. Do not include markdown formatting or backticks.
Format:
{
  "modules": [
    {
      "title": "Module Name (e.g. System Design)",
      "desc": "Short description of what the module covers",
      "topics": ["Specific Topic 1", "Specific Topic 2", "Specific Topic 3"]
    }
  ]
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    let modules = [];
    try {
      const parsed = JSON.parse(content);
      modules = parsed.modules || [];
    } catch {
      // fallback
    }

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Topics Generation Error:", error);
    return NextResponse.json({ error: 'Failed to generate study plan' }, { status: 500 });
  }
}
