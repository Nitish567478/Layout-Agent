import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble.jsx';

export default function ChatWindow({ messages, loading, onSend }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const examples = [
    'Convert this design to 9:16',
    'Move the headline to the top',
    'Make the headline smaller',
    'Design a professional Instagram promotional post for a digital marketing agency. Use a blue and white palette with large typography, floating analytics element, service cards, and a strong CTA button. Keep the layout minimal and balanced with modern UI styling.'
  ];

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  function handleSubmit(e) {
    e.preventDefault();
    const t = text;
    setText('');
    onSend(t);
  }

  return (
    <div className="flex h-[75vh] flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:h-[82vh]">
      <div ref={listRef} className="flex-1 overflow-auto pr-2">
        <div className="space-y-3">
          {messages.map((m, idx) => (
            <MessageBubble key={idx} role={m.role} content={m.content} />
          ))}
          {loading ? <MessageBubble role="assistant" content="Thinking..." /> : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask to transform the layout..."
          disabled={loading}
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          disabled={loading}
        >
          Send
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-left text-xs text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            disabled={loading}
            onClick={() => onSend(example)}
          >
            {example.length > 58 ? `${example.slice(0, 58)}...` : example}
          </button>
        ))}
      </div>
    </div>
  );
}

