import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getContest, addContest, editContest } from "../api/api";
const ContestForm = () => {
  const { id } = useParams(); // contest ID from route
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startTime: "",
    rankGuessStartTime: "",
    endTime: "",
    isScheduled: false,
    status: "Upcoming",
  });

  const [loading, setLoading] = useState(false);

  // If editing, load contest details
  useEffect(() => {
    if (isEdit) {
      getContest(id)
        .then((data) => {
          setFormData({
            name: data.name,
            description: data.description,
            startTime: new Date(data.startTime).toISOString().slice(0, 16),
            rankGuessStartTime: data.rankGuessStartTime
              ? new Date(data.rankGuessStartTime).toISOString().slice(0, 16)
              : "",
            endTime: new Date(data.endTime).toISOString().slice(0, 16),
            isScheduled: data.isScheduled,
            status: data.status,
          });
        })
        .catch((error) => {
          console.error("Error fetching contest details:", error);
          alert("Error loading contest details");
        });
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      rankGuessStartTime: formData.rankGuessStartTime
        ? new Date(formData.rankGuessStartTime)
        : null,
    };

    const res = await (isEdit ? editContest(id, payload) : addContest(payload));

    if (res) {
      alert(`Contest ${isEdit ? "updated" : "created"} successfully!`);
      navigate("/admin/contests");
    } else {
      alert("Error saving contest");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h2 className="text-3xl font-bold mb-6">
        {isEdit ? "Edit" : "Create"} Contest
      </h2>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white shadow p-6 rounded-lg border"
      >
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Contest Name
          </label>
          <input
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full border rounded-md p-2"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </div>

        {/* Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Time
            </label>
            <input
              name="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={handleChange}
              required
              className="mt-1 block w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Time
            </label>
            <input
              name="endTime"
              type="datetime-local"
              value={formData.endTime}
              onChange={handleChange}
              required
              className="mt-1 block w-full border rounded-md p-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Rank Guess Start Time (Optional)
          </label>
          <input
            name="rankGuessStartTime"
            type="datetime-local"
            value={formData.rankGuessStartTime}
            onChange={handleChange}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full border rounded-md p-2"
          >
            <option>Upcoming</option>
            <option>Rank Guess Phase</option>
            <option>Ongoing</option>
            <option>Rating Update Pending</option>
            <option>Finished</option>
          </select>
        </div>

        {/* Is Scheduled */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="isScheduled"
            checked={formData.isScheduled}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600"
          />
          <label className="text-sm text-gray-700">Is Scheduled</label>
        </div>

        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
          >
            {loading
              ? "Saving..."
              : isEdit
              ? "Update Contest"
              : "Create Contest"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContestForm;
