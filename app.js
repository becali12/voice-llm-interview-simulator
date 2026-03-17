const SYSTEM_PROMPT = (focus, name) => `You are a neutral and professional software engineering interviewer at a top tech company. Your role is to conduct a realistic but fair technical interview focused on: ${focus}.

${name ? `The candidate's name is ${name}.` : ''}

Guidelines:
- Start by briefly introducing yourself and welcoming the candidate
- Ask 3-5 technical questions appropriate for a mid-level SWE role
- After each answer, give brief neutral acknowledgment, then follow up or move to the next question
- Probe deeper if an answer is incomplete (ask "can you elaborate?" or "what's the time complexity?")
- Keep responses concise
- After 3-5 questions, wrap up naturally: "That covers what I wanted to explore today. Do you have any questions for me?"
- When the candidate says they're done or you've finished, end with "Thanks for your time. We'll be in touch."
- When the user doesn't know the answer to the question, teach them briefly.`;

const FEEDBACK_PROMPT = (transcript) => `You evaluated a software engineering interview. Here is the full transcript:

${transcript}

Now provide structured feedback as JSON with this exact shape:
{
  "overall": "one sentence overall impression",
  "score": "Strong / Adequate / Needs Work",
  "strengths": ["point 1", "point 2"],
  "improvements": ["point 1", "point 2"],
  "tip": "one concrete actionable tip"
}
Return ONLY the JSON, no markdown, no explanation.`;

// --- State ---
let apiKey = '';
let focus = '';
let candidateName = '';
let conversationHistory = [];
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let audioStream = null;
let currentAudio = null;
let interviewerBusy = false;

// --- UI helpers ---

function setStatus(state, text) {
  const dot = document.getElementById('status-dot');
  const label = document.getElementById('status-text');
  dot.className = 'dot ' + state;
  label.textContent = text;
}

function addMessage(role, text) {
  const chat = document.getElementById('chat');
  const isAI = role === 'assistant';

  const msg = document.createElement('div');
  msg.className = 'msg ' + (isAI ? 'ai' : 'user');

  const initials = isAI ? 'AI' : (candidateName ? candidateName.slice(0, 2).toUpperCase() : 'ME');
  msg.innerHTML = `
    <div class="msg-avatar">${initials}</div>
    <div class="msg-body">
      <div class="msg-role">${isAI ? 'Interviewer' : (candidateName || 'You')}</div>
      <div class="msg-text">${text}</div>
    </div>`;

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  return msg;
}

function showTyping() {
  const chat = document.getElementById('chat');
  const wrap = document.createElement('div');
  wrap.className = 'msg ai';
  wrap.id = 'typing-msg';
  wrap.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-body">
      <div class="msg-role">Interviewer</div>
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>`;
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-msg');
  if (el) el.remove();
}

// --- API calls ---

async function callGPT(messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 400
    })
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function speakText(text) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  setStatus('speaking', 'speaking');
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: 'tts-1', voice: 'onyx', input: text, speed: 1.0 })
  });
  if (!res.ok) throw new Error('TTS failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return new Promise(resolve => {
    currentAudio = new Audio(url);
    currentAudio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    currentAudio.onerror = resolve;
    currentAudio.play();
  });
}

async function transcribeAudio(blob) {
  const form = new FormData();
  form.append('file', blob, 'audio.webm');
  form.append('model', 'whisper-1');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: form
  });
  if (!res.ok) throw new Error('Transcription failed');
  const data = await res.json();
  return data.text.trim();
}

// --- Interview flow ---

async function interviewerTurn() {
  interviewerBusy = true;
  document.getElementById('mic-btn').disabled = true;
  document.getElementById('ctrl-hint').textContent = 'interviewer thinking...';
  setStatus('thinking', 'thinking');

  showTyping();
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT(focus, candidateName) },
      ...conversationHistory
    ];
    const reply = await callGPT(messages);
    removeTyping();
    conversationHistory.push({ role: 'assistant', content: reply });
    addMessage('assistant', reply);
    await speakText(reply);

    const replyLower = reply.toLowerCase();
    const isClosing = replyLower.includes("thanks for your time") ||
                      replyLower.includes("we'll be in touch") ||
                      replyLower.includes("we will be in touch");
    if (isClosing) {
      setTimeout(() => endInterview(), 1200);
      return;
    }
  } catch (e) {
    removeTyping();
    addMessage('assistant', `[Error: ${e.message}]`);
  }

  setStatus('idle', 'your turn');
  document.getElementById('mic-btn').disabled = false;
  document.getElementById('ctrl-hint').textContent = 'hold to speak, release to send';
  interviewerBusy = false;
}

async function toggleRecord() {
  if (interviewerBusy) return;
  if (!isRecording) {
    await startRecording();
  } else {
    stopRecording();
  }
}

async function startRecording() {
  try {
    if (!audioStream || audioStream.getTracks().every(t => t.readyState === 'ended')) {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    audioChunks = [];
    mediaRecorder = new MediaRecorder(audioStream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      await processRecording(blob);
    };
    mediaRecorder.start();
    isRecording = true;
    document.getElementById('mic-btn').classList.add('recording');
    document.getElementById('ctrl-hint').textContent = 'recording... click to stop';
    setStatus('listening', 'listening');
  } catch (e) {
    alert('Microphone access denied. Please allow mic access and try again.');
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    document.getElementById('mic-btn').classList.remove('recording');
    document.getElementById('mic-btn').disabled = true;
    document.getElementById('ctrl-hint').textContent = 'processing...';
    setStatus('thinking', 'transcribing');
  }
}

async function processRecording(blob) {
  try {
    const text = await transcribeAudio(blob);
    if (!text || text.length < 2) {
      document.getElementById('mic-btn').disabled = false;
      document.getElementById('ctrl-hint').textContent = 'nothing detected, try again';
      setStatus('idle', 'your turn');
      return;
    }
    conversationHistory.push({ role: 'user', content: text });
    addMessage('user', text);
    await interviewerTurn();
  } catch (e) {
    document.getElementById('ctrl-hint').textContent = `Error: ${e.message}`;
    document.getElementById('mic-btn').disabled = false;
    setStatus('idle', 'your turn');
  }
}

// --- Session management ---

async function startInterview() {
  apiKey = document.getElementById('api-key').value.trim();
  focus = document.getElementById('focus').value;
  candidateName = document.getElementById('candidate-name').value.trim();

  if (!apiKey.startsWith('sk-')) {
    alert('Please enter a valid OpenAI API key (starts with sk-)');
    return;
  }

  document.getElementById('btn-start').disabled = true;
  document.getElementById('btn-start').textContent = 'Starting...';

  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('interview-screen').style.display = 'flex';

  conversationHistory = [];
  await interviewerTurn();
}

async function endInterview() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (isRecording) { mediaRecorder.stop(); isRecording = false; }
  if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); audioStream = null; }

  document.getElementById('interview-screen').style.display = 'none';

  const fbScreen = document.getElementById('feedback-screen');
  fbScreen.style.display = 'flex';

  const fbCard = document.getElementById('fb-summary');
  fbCard.innerHTML = '<h3>Generating feedback...</h3><p style="color:var(--text3);font-size:13px;margin-top:8px;">Analyzing your interview performance...</p>';

  const transcript = conversationHistory
    .map(m => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  try {
    const raw = await callGPT([{ role: 'user', content: FEEDBACK_PROMPT(transcript) }]);
    const fb = JSON.parse(raw);

    const scoreClass = fb.score === 'Strong' ? 'good' : fb.score === 'Adequate' ? 'ok' : 'bad';

    fbCard.innerHTML = `
      <h3>Overall Assessment</h3>
      <p style="margin-bottom:12px;">${fb.overall}</p>
      <div class="score-row">
        <div class="score-chip ${scoreClass}">${fb.score}</div>
      </div>`;

    const strengths = document.createElement('div');
    strengths.className = 'fb-card';
    strengths.innerHTML = `<h3>Strengths</h3><pre>${fb.strengths.map(s => '✓  ' + s).join('\n')}</pre>`;

    const improvements = document.createElement('div');
    improvements.className = 'fb-card';
    improvements.innerHTML = `<h3>Areas to Improve</h3><pre>${fb.improvements.map(s => '→  ' + s).join('\n')}</pre>`;

    const tip = document.createElement('div');
    tip.className = 'fb-card';
    tip.innerHTML = `<h3>Top Tip</h3><p>${fb.tip}</p>`;

    const restartBtn = fbScreen.querySelector('.btn-restart');
    fbScreen.insertBefore(strengths, restartBtn);
    fbScreen.insertBefore(improvements, restartBtn);
    fbScreen.insertBefore(tip, restartBtn);

  } catch (e) {
    fbCard.innerHTML = `<h3>Feedback unavailable</h3><p style="color:var(--text3)">Could not generate feedback: ${e.message}</p>`;
  }
}

function restart() {
  conversationHistory = [];
  if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); audioStream = null; }
  document.getElementById('chat').innerHTML = '';
  document.getElementById('feedback-screen').style.display = 'none';
  document.getElementById('feedback-screen').querySelectorAll('.fb-card:not(#fb-summary)').forEach(el => el.remove());
  document.getElementById('fb-summary').innerHTML = '<h3>Loading feedback...</h3>';
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-start').textContent = 'Start Interview';
  document.getElementById('setup-screen').style.display = 'flex';
}
