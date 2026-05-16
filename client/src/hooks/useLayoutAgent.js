import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import initialLayout from '../data/initialLayout.json';

const STORAGE_KEY = 'layout-agent-state-v1';
const initialMessages = [
  {
    role: 'assistant',
    content:
      'Send an instruction (e.g., "Convert this design to 9:16", "Move the headline to the top", "Make the headline smaller").'
  }
];

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved?.layout?.rootNodes?.length || !Array.isArray(saved.messages)) return null;
    return saved;
  } catch {
    return null;
  }
}

export default function useLayoutAgent() {
  const saved = typeof window !== 'undefined' ? loadSavedState() : null;
  const [layout, setLayout] = useState(saved?.layout || initialLayout);
  const [messages, setMessages] = useState(saved?.messages || initialMessages);
  const [loading, setLoading] = useState(false);

  const history = useMemo(() => messages.slice(-6), [messages]);

  useEffect(() => {
    if (!layout?.rootNodes?.length) setLayout(initialLayout);
  }, [layout]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        layout,
        messages
      })
    );
  }, [layout, messages]);

  function resetAgent() {
    localStorage.removeItem(STORAGE_KEY);
    setLayout(initialLayout);
    setMessages(initialMessages);
  }

  async function sendMessage(text) {
    const trimmed = String(text ?? '').trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await axios.post('/api/chat', {
        message: trimmed,
        layout,
        history
      });

      if (data?.updatedLayout) setLayout(data.updatedLayout);
      const assistant = data?.assistantMessage || 'Updated layout.';
      setMessages((prev) => [...prev, { role: 'assistant', content: assistant }]);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Request failed';
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  return { layout, messages, loading, sendMessage, resetAgent };
}

