const getSubmissionStatus = async (tokens, maxRetries = 60, delayMs = 1000) => {
  const url = `${process.env.JUDGE0_API}/submissions/batch?tokens=${tokens}&base64_encoded=true`;
  let retries = 0;

  const decode = (base64Str) => {
    if (!base64Str) return "";
    return Buffer.from(base64Str, "base64").toString("utf-8");
  };

  while (retries < maxRetries) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Raw submission status response:", data);

    const submissions = data.submissions.map((sub) => ({
      ...sub,
      stdout: decode(sub.stdout),
      stderr: decode(sub.stderr),
      compile_output: decode(sub.compile_output),
      message: decode(sub.message),
    }));

    const pending = submissions.filter((sub) => sub.status.id < 3);

    if (pending.length === 0) {
      return submissions;
    }

    retries++;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new Error("Timeout: Submissions not finished after max retries.");
};

module.exports = {
  getSubmissionStatus,
};
