const ProblemTab = ({ title, tabId, index, onClick }) => {
  return (
    <div className="tab text-center">
      <button
        className={`p-1 pl-2 pr-2 text-sm font-medium rounded-lg ${
          index === tabId
            ? "bg-gray-800 text-white"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
        onClick={onClick}
      >
        {title}
      </button>
    </div>
  );
};

export default ProblemTab;
