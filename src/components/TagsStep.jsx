import React, { useEffect, useState } from "react";
import { getAllTags } from "../api/api";

export default function TagsStep({ data, setData }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState("");

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    fetchTags();
  }, []);

  const addTag = () => {
    if (selectedTagId && !data.tags.includes(selectedTagId)) {
      setData({ ...data, tags: [...data.tags, selectedTagId] });
      setSelectedTagId("");
    }
  };

  const removeTag = (id) => {
    setData({ ...data, tags: data.tags.filter((t) => t !== id) });
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
        Tags
      </h2>

      <div className="flex items-center gap-2">
        <select
          value={selectedTagId}
          onChange={(e) => setSelectedTagId(e.target.value)}
          className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white"
        >
          <option value="">Select a tag</option>
          {availableTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.tag}
            </option>
          ))}
        </select>

        <button
          onClick={addTag}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Add Tag
        </button>
      </div>

      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {data.tags.map((tagId, idx) => {
            const tagObj = availableTags.find((t) => t.id === tagId);
            return (
              <div
                key={idx}
                className="flex items-center gap-2 bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100 px-3 py-1 rounded-full"
              >
                <span>{tagObj?.tag || "Unknown Tag"}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tagId)}
                  className="hover:text-red-500"
                >
                  ❌
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
