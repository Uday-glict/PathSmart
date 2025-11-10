import React, { useState } from "react";
import axios from "axios";

export default function AIHelperWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    setMessages([...messages, userMsg]);

    try {
      const res = await axios.post("http://localhost:3000/api/ai-helper/query", {
        page_url: window.location.href,
        user_query: input,
      });

      const aiMsg = { sender: "ai", text: res.data.response };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "⚠️ AI helper unavailable." },
      ]);
    } finally {
      setInput("");
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg text-lg"
      >
        💬
      </button>

      {/* Chat Box */}
      {open && (
        <div className="fixed bottom-20 right-5 w-80 bg-white border border-gray-300 rounded-xl shadow-lg flex flex-col">
          <div className="bg-blue-600 text-white p-3 rounded-t-xl font-semibold">
            AI Helper
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg ${
                  m.sender === "user"
                    ? "bg-blue-100 self-end"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex border-t">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for help..."
              className="flex-1 p-2 outline-none"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-3 py-2 rounded-r-lg"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
