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

async function uploadToGCS(bucketName, filePath, contents) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);
  await file.save(contents);
  console.log(`Saved to GCS: ${filePath}`);
}

module.exports = {
  fetchFileFromGCS,
  uploadToGCS,
};
