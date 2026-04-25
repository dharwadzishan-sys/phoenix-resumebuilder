import { NextResponse } from 'next/server';
import groq from '@/lib/groqClient';

export async function POST(req: Request) {
  try {
    const { targetRole, domain, focusAreas } = await req.json();

    const prompt = `You are an expert technical interviewer.
Generate EXACTLY 5 relevant interview questions for a ${targetRole} in the ${domain} industry.
Include technical and behavioral questions${focusAreas ? `, with a special focus on: ${focusAreas}` : ""}.

CRITICAL INSTRUCTION: You must return the output STRICTLY as a JSON object wrapping an array. Do not include any markdown.
Format:
{
  "questions": [
    { "q": "Question text here", "a": "Ideal response using STAR method or technical details here" }
  ]
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content || "[]";
    let questions = [];
    
    // The model might return `{ "questions": [...] }` or `[...]`. Let's handle parsing robustly.
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    } catch {
      // fallback
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("QA Generation Error:", error);
    return NextResponse.json({ error: 'Failed to generate Q&A' }, { status: 500 });
  }
}
