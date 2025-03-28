// import dotenv from "dotenv";
// dotenv.config();
async function api() {
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  //   if (body) {
  //     options.body = JSON.stringify(body);
  //   }
  const url = `${import.meta.env.VITE_BASE_URL}/hello`;
  console.log("URL:", url);
  return await fetch(url, options)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .catch((error) => {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
    });
}

async function executeCode(code) {
  console.log("Code:", typeof code);
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  };
  const body = {
    source_code: code,
    language_id: "71",
    stdin: "",
    callback_url: "http://localhost:5000/callback",
  };
  const url = `${import.meta.env.VITE_JUDGE0_API}/submissions`;
  console.log("URL:", url);
  return await fetch(url, options, body)
    .then((response) => {
      console.log("Response:", response);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .catch((error) => {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
    });
}

export { api, executeCode };
