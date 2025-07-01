const { PrismaClient } = require("@prisma/client/edge");
const { withAccelerate } = require("@prisma/extension-accelerate");

const prisma = new PrismaClient().$extends(withAccelerate());

module.exports = prisma;
