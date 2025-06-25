export default function ProblemDetailsStep({ data, setData }) {
  const updateField = (field) => (e) =>
    setData({ ...data, [field]: e.target.value });

  return (
    <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
        Problem Details
      </h2>

      {/* Title */}
      <div className="space-y-2">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          required
          placeholder="e.g., Sum of Two Numbers"
          value={data.title}
          onChange={updateField("title")}
          className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          rows={5}
          required
          placeholder="Write the full problem description here..."
          value={data.description}
          onChange={updateField("description")}
          className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <label
          htmlFor="difficulty"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Difficulty Level
        </label>
        <select
          id="difficulty"
          value={data.difficulty}
          onChange={updateField("difficulty")}
          className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      {/* Score and Contest ID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="problemScore"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Problem Score <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="problemScore"
            type="number"
            placeholder="e.g., 100"
            value={data.problemScore}
            onChange={updateField("problemScore")}
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="contestId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Contest ID <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="contestId"
            type="text"
            placeholder="e.g., abc123"
            value={data.contestId}
            onChange={updateField("contestId")}
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Limits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="max_time_limit"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Max Time Limit (seconds)
          </label>
          <input
            id="max_time_limit"
            type="number"
            placeholder="e.g., 2"
            value={data.max_time_limit}
            onChange={updateField("max_time_limit")}
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="max_memory_limit"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Max Memory Limit (kB)
          </label>
          <input
            id="max_memory_limit"
            type="number"
            placeholder="e.g., 262144"
            value={data.max_memory_limit}
            onChange={updateField("max_memory_limit")}
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
