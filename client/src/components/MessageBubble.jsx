export default function MessageBubble({ role, content }) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[90%] rounded-lg bg-blue-600 px-4 py-2 text-white'
            : 'max-w-[90%] rounded-lg bg-slate-100 px-4 py-2 text-slate-800'
        }
      >
        <div className="whitespace-pre-wrap text-sm">{content}</div>
      </div>
    </div>
  );
}

