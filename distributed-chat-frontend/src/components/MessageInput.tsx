import { FormEvent, useState } from 'react';

interface MessageInputProps {
  disabled: boolean;
  onSend: (content: string) => boolean;
}

export function MessageInput({ disabled, onSend }: MessageInputProps) {
  const [content, setContent] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = content.trim();
    if (!value || disabled) return;
    if (onSend(value)) setContent('');
  };

  return (
    <form className="message-composer" onSubmit={submit}>
      <input
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={disabled ? 'Waiting for connection…' : 'Type a message…'}
        disabled={disabled}
        aria-label="Message"
      />
      <button className="primary-button send-button" type="submit" disabled={disabled || !content.trim()}>Send</button>
    </form>
  );
}
