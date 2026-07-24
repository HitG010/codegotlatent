const getSubmissionStatus = async (
  tokens,
  maxWaitMs = 120000,
  initialDelayMs = 300
) => {
  const url = `${process.env.JUDGE0_API}/submissions/batch?tokens=${tokens}&base64_encoded=true`;
  const startedAt = Date.now();
  let delayMs = initialDelayMs;

  const decode = (base64Str) => {
    if (!base64Str) return "";
    return Buffer.from(base64Str, "base64").toString("utf-8");
  };

  while (Date.now() - startedAt < maxWaitMs) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(
        `Error fetching submission status: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    // console.log("Raw submission status response:", data);

    const submissions = (data.submissions || []).filter(Boolean).map((sub) => ({
      ...sub,
      stdout: decode(sub?.stdout),
      stderr: decode(sub?.stderr),
      compile_output: decode(sub?.compile_output),
      message: decode(sub?.message),
    }));

    const pending = submissions.filter((sub) => sub.status.id < 3);

    if (pending.length === 0) {
      return submissions;
    }

    await new Promise((r) => setTimeout(r, delayMs));
    // Back off gently: fast first polls for quick verdicts, less chatter on slow ones
    delayMs = Math.min(delayMs * 1.5, 1500);
  }

  throw new Error("Timeout: Submissions not finished within max wait time.");
};

module.exports = {
  getSubmissionStatus,
};
