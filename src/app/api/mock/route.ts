import { NextResponse } from 'next/server';
import groq from '@/lib/groqClient';

export async function POST(req: Request) {
  try {
    const { targetRole, chatHistory } = await req.json();

    // The chatHistory looks like: [{ role: "user", content: "..." }, { role: "assistant", content: "..." }]
    const systemPrompt = `You are a strict but fair technical interviewer for a ${targetRole} role.
Your job is to conduct a mock interview simulator.
1. When the conversation starts, introduce yourself briefly and ask the first question.
2. When the user responds, evaluate their answer, provide a score out of 10, offer short constructive feedback, and then seamlessly ask the NEXT relevant question.
3. Keep your responses concise, professional, and directly related to the interview format.

If the user says something completely off-topic, politely redirect them back to the interview.
Do not break character. Do not use markdown backticks unless writing a specific code snippet.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chatHistory || [])
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: messages as any,
      model: 'llama3-8b-8192',
    });

    const response = chatCompletion.choices[0]?.message?.content || "I'm sorry, I encountered an error computing your response.";

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Mock Interview Error:", error);
    return NextResponse.json({ error: 'Failed to communicate with interviewer' }, { status: 500 });
  }
}
