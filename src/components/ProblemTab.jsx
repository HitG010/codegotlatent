

const ProblemTab = ({ title, tabId, index, onClick }) => {
  return (
    <div className="tab text-center">
      <button
        className={`p-1 pl-2 pr-2 text-sm font-medium rounded-md ${
          index === tabId
            ? "bg-[#ffffff10] text-white"
            : "text-white/25"
        }`}
        onClick={onClick}
      >
        {title}
      </button>
    </div>
  );
};

export default ProblemTab;
