const validateSubmissionInput = (input) => {
  if (!input.language || !input.code) {
    throw new Error("Language and code are required fields.");
  }
  // Additional validation logic can be added here
};

const formatResponse = (data) => {
  return {
    success: true,
    data: data,
  };
};

const formatErrorResponse = (error) => {
  return {
    success: false,
    message: error.message,
  };
};

module.exports = {
  validateSubmissionInput,
  formatResponse,
  formatErrorResponse,
};