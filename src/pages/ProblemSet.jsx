import React, { useEffect, useState } from "react";
import axios from "axios";
import { fetchProblems, fetchTags } from "../api/api";
import { Link, Navigate } from "react-router-dom";
import useUserStore from "../store/userStore";
import Navbar from "../components/Navbar";
import DifficultyTag from "../components/DifficultyTag";
import AvatarProgressRing from "../components/avatarProgressRing";
import contestTrophy from "../assets/trophy.svg";
import { FaArrowRightLong, FaCheck, FaCross } from "react-icons/fa6";
import latentNavLogo from "../assets/latentNavLogo.svg";
import { getUserProblemCount, getUserDetails } from "../api/api";
import { FaCircleHalfStroke } from "react-icons/fa6";
import { avatars } from "../components/Avatars";
import { ChevronDown } from "lucide-react";


const ProblemSet = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [easyCount, setEasyCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [easyTotal, setEasyTotal] = useState(0);
  const [mediumTotal, setMediumTotal] = useState(0);
  const [hardTotal, setHardTotal] = useState(0);
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.accessToken);
  const [userDetails, setUserDetails] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  async function fetchAllTags() {
    try {
      const response = await fetchTags();
      console.log("All Tags Response:", response);
      // Handle both array of strings and array of objects
      const processedTags = response.map(tag => 
        typeof tag === 'string' ? tag : tag?.tag || tag?.name || String(tag)
      );
      setTags(processedTags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      setError("Failed to fetch tags");
      setTags([]); // Set empty array as fallback
    }
  }

  async function fetchProblemSet() {
    const response = await fetchProblems(user.id);
    setProblems([...response]);
    setFilteredProblems([...response]);
  }

  // Filter problems based on search query, difficulty, tags, and status
  const filterProblems = () => {
    let filtered = [...problems];

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(problem =>
        problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (problem.tags && problem.tags.some(tag => {
          // Handle both string tags and object tags from problem data
          const tagName = typeof tag === 'string' ? tag : tag?.tag || tag?.name || String(tag);
          return tagName.toLowerCase().includes(searchQuery.toLowerCase());
        }))
      );
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(problem => 
        problem.difficulty.toLowerCase() === selectedDifficulty.toLowerCase()
      );
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(problem =>
        problem.tags && selectedTags.every(selectedTag =>
          problem.tags.some(tag => {
            // Handle both string tags and object tags from problem data
            const tagName = typeof tag === 'string' ? tag : tag?.tag || tag?.name || String(tag);
            return tagName === selectedTag;
          })
        )
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'solved') {
        filtered = filtered.filter(problem => problem.isSolved === true);
      } else if (selectedStatus === 'attempted') {
        filtered = filtered.filter(problem => problem.isSolved === false);
      } else if (selectedStatus === 'not-attempted') {
        filtered = filtered.filter(problem => problem.isSolved === null);
      }
    }

    setFilteredProblems(filtered);
  };

  // Handle tag selection
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDifficulty('all');
    setSelectedTags([]);
    setSelectedStatus('all');
  };

  async function fetchUserDetails() {
    try {
      const details = await getUserDetails(user.id);
      console.log("User Details:", details);
      // return details;
      setUserDetails(details);
    } catch (error) {
      console.error("Error fetching user details:", error);
      setError("Failed to fetch user details");
    }
  }

  async function fetchProblemCount() {
    const response = await getUserProblemCount(user.id);
    console.log("Problem Count Response:", response);
    setEasyCount(response.easyCount);
    setMediumCount(response.mediumCount);
    setHardCount(response.hardCount);
    setEasyTotal(response.totalEasyCount);
    setMediumTotal(response.totalMediumCount);
    setHardTotal(response.totalHardCount);
  }


  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchProblemSet(),
          fetchProblemCount(),
          fetchUserDetails(),
          fetchAllTags()
        ]);
      } catch (error) {
        console.error("Error initializing data:", error);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Apply filters whenever filter states change
  useEffect(() => {
    if (problems.length > 0) {
      filterProblems();
    }
  }, [searchQuery, selectedDifficulty, selectedTags, selectedStatus, problems, tags]);
  const pathname = window.location.pathname;
  return (
    <div>
      <div className="h-screen w-full flex flex-col lg:flex-row justify-between bg-[#0F0F0F] overflow-hidden">
        <Navbar path={pathname} />
        <div className="w-full lg:w-[80%] h-full flex flex-col lg:flex-row justify-between gap-4">
          <div className="home flex flex-col h-full p-4 lg:pl-10 pt-6 lg:pt-16 pb-24 lg:pb-4 bg-[#0F0F0F] w-full overflow-y-auto">
            <h2 className="text-white text-2xl lg:text-4xl font-semibold mb-4">
              Problems
            </h2>
            {/* Search and Filter Section */}
            <div className="search-filter-section mb-1">
              {/* Search Bar */}
              <div className="search-bar mb-4 relative">
                <input
                  type="text"
                  placeholder="Search problems by title or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2 lg:py-3 px-4 lg:px-5 rounded-full bg-[#ffffff25] text-[#ffffff] focus:outline-none text-sm lg:text-base"
                />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-white/15 hover:bg-white/25 px-3 lg:px-4 py-1 lg:py-2 rounded-full text-white text-xs lg:text-sm transition-colors flex items-center gap-0"
                >
                  Filters {showFilters ? <ChevronDown  className="transform rotate-180 w-3 lg:w-4" /> : <ChevronDown className="w-3 lg:w-4" />}
                </button>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="filter-panel bg-[#1A1A1A] p-4 lg:p-6 rounded-lg mb-4 border border-[#ffffff20]">
                  <div className="flex flex-col lg:flex-row flex-wrap gap-4 lg:gap-6">
                    {/* Difficulty Filter */}
                    <div className="filter-group">
                      <label className="block text-white/65 text-sm font-medium mb-2">Difficulty</label>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="w-full lg:w-auto bg-[#2A2A2A] text-white p-2 lg:p-1 rounded border border-[#ffffff30] focus:outline-none focus:ring-2 focus:ring-white text-sm cursor-pointer"
                      >
                        <option value="all">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="filter-group">
                      <label className="block text-white/65 text-sm font-medium mb-2">Status</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full lg:w-auto bg-[#2A2A2A] text-white p-2 lg:p-1 rounded border border-[#ffffff30] focus:outline-none focus:ring-2 focus:ring-white text-sm cursor-pointer"
                      >
                        <option value="all">All Problems</option>
                        <option value="solved">Solved</option>
                        <option value="attempted">Attempted</option>
                        <option value="not-attempted">Not Attempted</option>
                      </select>
                    </div>

                    {/* Tags Filter */}
                    <div className="filter-group flex-1">
                      <label className="block text-white/65 text-sm font-medium mb-2">Tags</label>
                      <div className="flex flex-wrap gap-2 max-h-24 lg:max-h-32 overflow-y-auto">
                        {tags && tags.length > 0 ? (
                          tags.map((tag, index) => {
                            // Ensure tag is a string (handle both string and object formats)
                            const tagName = typeof tag === 'string' ? tag : tag?.tag || tag?.name || String(tag);
                            return (
                              <button
                                key={`filter-tag-${index}-${tagName}`}
                                onClick={() => toggleTag(tagName)}
                                className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                  selectedTags.includes(tagName)
                                    ? 'bg-white text-black'
                                    : 'bg-[#2A2A2A] text-white/70 hover:bg-[#3A3A3A]'
                                }`}
                              >
                                {tagName}
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-white/40 text-sm">Loading tags...</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Filter Actions */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-0 mt-4 pt-4 border-t border-[#ffffff20]">
                    <div className="text-white/60 text-sm">
                      Showing {filteredProblems.length} of {problems.length} problems
                    </div>
                    <button
                      onClick={clearFilters}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white text-sm transition-colors w-full lg:w-auto"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Active Filters Display */}
              {(searchQuery || selectedDifficulty !== 'all' || selectedTags.length > 0 || selectedStatus !== 'all') && (
                <div className="active-filters mb-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-white/60 text-sm">Active filters:</span>
                    
                    {searchQuery && (
                      <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Search: "{searchQuery}"
                        <button onClick={() => setSearchQuery('')} className="hover:text-white">×</button>
                      </span>
                    )}
                    
                    {selectedDifficulty !== 'all' && (
                      <span className="bg-yellow-600/20 text-yellow-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
                        <button onClick={() => setSelectedDifficulty('all')} className="hover:text-white">×</button>
                      </span>
                    )}
                    
                    {selectedStatus !== 'all' && (
                      <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1).replace('-', ' ')}
                        <button onClick={() => setSelectedStatus('all')} className="hover:text-white">×</button>
                      </span>
                    )}
                    
                    {selectedTags.map((tag, index) => (
                      <span key={`active-tag-${index}`} className="bg-purple-600/20 text-purple-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        {tag}
                        <button onClick={() => toggleTag(tag)} className="hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="problem-statement flex flex-col">
              {loading ? (
                <div className="w-full text-center justify-center text-white py-8">
                  <div className="text-lg">Loading problems...</div>
                </div>
              ) : error ? (
                <div className="text-center text-red-400 py-8">
                  <div className="text-lg mb-2">Error loading data</div>
                  <div className="text-sm">{error}</div>
                </div>
              ) : filteredProblems.length === 0 ? (
                <div className="text-center text-white/60 py-8">
                  <div className="text-lg mb-2">No problems found</div>
                  <div className="text-sm">Try adjusting your search or filter criteria</div>
                </div>
              ) : (
                filteredProblems.map((problem, idx) => (
                  <Link key={problem.id} to={`/problem/${problem.id}`}>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-[#1A1A1A] p-3 lg:p-4 mb-3 lg:mb-4 rounded-lg hover:bg-[#2A2A2A] transition-colors duration-300 gap-2 lg:gap-0">
                      <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 items-start lg:items-center w-full lg:w-auto">
                        <div className="flex items-center gap-2 lg:gap-3">
                          {problem.isSolved === true ? (
                            <FaCheck className="text-green-500 flex-shrink-0"/>
                          ) : ( problem.isSolved === false ? (
                            <FaCircleHalfStroke className="text-yellow-500 flex-shrink-0"/>
                          ) : (
                            <div className="h-4 w-4 flex-shrink-0"/>
                          ))}
                          <h2 className="font-semibold text-base lg:text-lg text-white">
                            {problems.findIndex(p => p.id === problem.id) + 1}. {problem.title}
                          </h2>
                        </div>
                        {/* Display tags */}
                        {problem.tags && problem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-6 lg:ml-2">
                            {problem.tags.slice(0, 2).map((tag, tagIndex) => {
                              const tagName = typeof tag === 'string' ? tag : tag?.tag || tag?.name || String(tag);
                              return (
                                <span key={`${problem.id}-tag-${tagIndex}-${tagName}`} className="bg-[#ffffff15] text-white/70 px-2 py-1 rounded text-xs">
                                  {tagName}
                                </span>
                              );
                            })}
                            {problem.tags.length > 2 && (
                              <span className="text-white/50 text-xs">+{problem.tags.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 lg:gap-4 ml-6 lg:ml-0">
                        <p className="text-gray-400 text-xs lg:text-sm">
                          {problem.submissionCount > 0 ? 
                          ((problem.acceptedCount/problem.submissionCount)*100).toFixed(2) : 0}%
                        </p>
                        <DifficultyTag tag={problem.difficulty} />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
          <div className="hidden xl:flex flex-col h-fit gap-4">
            <div className="py-4 px-6 xl:px-8 rounded-2xl bg-[#ffffff25] h-fit mt-30 mr-8 flex flex-col">
              <div className="flex flex-row gap-8 xl:gap-12 items-center">
                <AvatarProgressRing progress={((easyCount+mediumCount+hardCount)/(easyTotal+mediumTotal+hardTotal)*100).toFixed(2)} imageComponent={avatars[userDetails?.pfpId - 1]} />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-row justify-between w-[150px] xl:w-[170px]">
                    <p className="text-base xl:text-lg font-medium text-green-500">Easy</p>
                    <p className="text-white text-base xl:text-lg font-medium">{easyCount}/{easyTotal}</p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-yellow-500 text-base xl:text-lg font-medium">
                      Medium
                    </p>
                    <p className="text-white text-base xl:text-lg font-medium">{mediumCount}/{mediumTotal}</p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-red-500 text-base xl:text-lg font-medium">Hard</p>
                    <p className="text-white text-base xl:text-lg font-medium">{hardCount}/{hardTotal}</p>
                  </div>
                </div>
              </div>
            </div>
            <Link
              to={"/contests"}
              className="mr-8 problem-button flex-1 pt-5 pl-5 pb-5 flex flex-row items-center border-1 border-[#1267D020] rounded-3xl hover:inset-shadow-xs hover:inset-shadow-[#F4DD6A45] hover:cursor-pointer transition-all duration-300 hover:bg-[#1267D010]"
              style={{
                boxShadow:
                  "inset 0 0 30px rgba(17, 112, 228, 0.15), inset 0 0 10px rgba(17, 112, 228, 0.08), inset 0 1px 2px rgba(17, 112, 228, 0.27)",
              }}
            >
              <div className="flex flex-col p-2">
                <div className="flex flex-row gap-3 items-center justify-items-start mb-3 hover:gap-4 transition-all duration-300">
                  <h1 className="text-2xl font-semibold">Contests</h1>
                  <FaArrowRightLong className="h-5 w-5" />
                </div>
                <p className="text-[#ffffff65] text-sm">
                  Show your coding skills in Rated Contests with a Twist in
                  Ratings. Attempt a Contest Now!
                </p>
              </div>
              <img
                src={contestTrophy}
                alt="Contest Trophy"
                className="h-20 w-20 mr-5"
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemSet;
