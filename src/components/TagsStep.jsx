import React, { useState } from "react";

export default function TagsStep({ data, setData }) {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !data.tags.includes(tag)) {
      setData({ ...data, tags: [...data.tags, tag] });
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    setData({ ...data, tags: data.tags.filter((t) => t !== tag) });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        Tags
      </h2>

      <div className="flex items-center gap-2">
        <input
          type="text"
          className="flex-grow px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., Dynamic Programming"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          type="button"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          onClick={addTag}
        >
          Add Tag
        </button>
      </div>

      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {data.tags.map((tag, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100 px-3 py-1 rounded-full shadow-sm"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-sm hover:text-red-500 transition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
