import { NextResponse } from 'next/server';
import groq from '@/lib/groqClient';

export async function POST(req: Request) {
  try {
    const { targetRole, experience, notes } = await req.json();

    const prompt = `You are an expert AI Resume Writer.
Given the following details, generate an optimized, ATS-friendly markdown resume for a ${targetRole} with ${experience} level experience.
Focus on incorporating strong action verbs and quantitative achievements in the style of the Harvard Resume format.

Here are the user's raw notes/details to extract from:
${notes}

Return ONLY the Markdown output. Do not include introductory text.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
    });

    const markdown = chatCompletion.choices[0]?.message?.content || "Failed to generate.";

    return NextResponse.json({ markdown });
  } catch (error) {
    console.error("Resume Generation Error:", error);
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
  }
}
