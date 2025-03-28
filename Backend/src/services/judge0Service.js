class Judge0Service {
  constructor() {
    this.baseUrl = process.env.JUDGE0_API_URL || 'https://api.judge0.com';
  }

  async createSubmission(languageId, sourceCode, stdin = '') {
    const response = await fetch(`${this.baseUrl}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: languageId,
        stdin: stdin,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create submission');
    }

    return response.json();
  }

  async getSubmissionResult(submissionId) {
    const response = await fetch(`${this.baseUrl}/submissions/${submissionId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to retrieve submission result');
    }

    return response.json();
  }
}

module.exports = Judge0Service;