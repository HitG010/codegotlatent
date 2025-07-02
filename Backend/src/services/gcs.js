const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const BUCKET_NAME = "codegotlatent";

async function fetchFileFromGCS(path) {
  const file = storage.bucket(BUCKET_NAME).file(path);
  const [contents] = await file.download();
  return contents.toString("utf-8");
}
