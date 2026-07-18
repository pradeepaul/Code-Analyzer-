import React, { useState } from 'react';
//import { Button } from 'particals-ui';

// function App() {
//   return (
//     <>
//       <Button title='test button' variant='contained'></Button>
//     </>
//   );
// }

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    try {
      const res = await fetch('http://localhost:4000/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages([
          ...messages,
          { role: 'agent', text: `Error: ${data.error}` },
        ]);
      } else {
        setMessages([
          ...messages,
          { role: 'user', text: input },
          { role: 'agent', text: data.advice },
        ]);
      }
    } catch (err) {
      setMessages([...messages, { role: 'agent', text: 'Network error' }]);
    }
  };

  return (
    <div>
      <div>
        {messages.map((m, i) => (
          <p key={i}>
            <b>{m.role}:</b>{' '}
            <div dangerouslySetInnerHTML={{ __html: m.text }}></div>
          </p>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={sendMessage}>Ask</button>
    </div>
  );
}

export default App;
