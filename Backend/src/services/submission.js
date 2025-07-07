const getSubmissionStatus = async (tokens, maxRetries = 20, delayMs = 1000) => {
  const url = `${process.env.JUDGE0_API}/submissions/batch?tokens=${tokens}`;
  let retries = 0;

  while (retries < maxRetries) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Submission Status Data:", data);
    const pending = data.submissions.filter((sub) => sub.status.id < 3);

    if (pending.length === 0) {
      return data.submissions;
    }

    retries++;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new Error("Timeout: Submissions not finished after max retries.");
};

module.exports = {
  getSubmissionStatus,
};
