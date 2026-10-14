import { renderMarkdown, type ProblemPackage } from "@cgl/problem-package";
import type { Db } from "../db.js";
import type { BlobStore } from "../storage/blob-store.js";

export interface PublishOptions {
  /** List the problem in practice now, if it isn't already. */
  listInPractice?: boolean;
}

export interface PublishResult {
  problemId: string;
  slug: string;
  version: number;
  status: "created" | "updated" | "unchanged";
}

export class PublishError extends Error {}

function tagSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Publishes a loaded package as the problem's newest version. Problems are
 * matched by package uuid, so renaming the folder or slug keeps history.
 * Publishing an unchanged package is a no-op.
 */
export async function publishProblem(
  db: Db,
  blobs: BlobStore,
  pkg: ProblemPackage,
  options: PublishOptions = {},
): Promise<PublishResult> {
  const existing = await db.problem.findUnique({
    where: { packageUuid: pkg.uuid },
    select: { id: true, publishedAt: true, currentVersion: { select: { number: true, packageHash: true } } },
  });

  const slugOwner = await db.problem.findUnique({ where: { slug: pkg.slug }, select: { packageUuid: true } });
  if (slugOwner && slugOwner.packageUuid !== pkg.uuid) {
    throw new PublishError(`slug "${pkg.slug}" already belongs to another problem`);
  }

  const listNow = options.listInPractice && !existing?.publishedAt;
  if (existing?.currentVersion?.packageHash === pkg.hash) {
    if (listNow) await db.problem.update({ where: { id: existing.id }, data: { publishedAt: new Date() } });
    return { problemId: existing.id, slug: pkg.slug, version: existing.currentVersion.number, status: "unchanged" };
  }

  // Files go to the blob store before the database refers to them. They're
  // content-addressed, so a publish that fails later leaves only harmless orphans.
  const files = new Map<string, Buffer>();
  for (const test of pkg.tests) {
    files.set(test.inputHash, test.input);
    files.set(test.answerHash, test.answer);
  }
  await Promise.all([...files].map(([hash, data]) => blobs.put(hash, data)));

  const [statementHtml, editorialHtml] = await Promise.all([
    renderMarkdown(pkg.statementMarkdown),
    pkg.editorialMarkdown === null ? null : renderMarkdown(pkg.editorialMarkdown),
  ]);
  const samples = pkg.tests
    .filter((test) => test.isSample)
    .map((test) => ({ input: test.input.toString("utf8"), output: test.answer.toString("utf8") }));
  const tags = pkg.tags.map((name) => ({ name, slug: tagSlug(name) })).filter((tag) => tag.slug);

  return db.$transaction(async (tx) => {
    await tx.blob.createMany({
      data: [...files].map(([hash, data]) => ({ hash, size: data.length })),
      skipDuplicates: true,
    });
    for (const tag of tags) {
      await tx.tag.upsert({ where: { slug: tag.slug }, create: tag, update: {} });
    }

    const fields = {
      slug: pkg.slug,
      title: pkg.title,
      difficulty: pkg.difficulty,
      tags: { set: tags.map(({ slug }) => ({ slug })) },
      ...(listNow ? { publishedAt: new Date() } : {}),
    };
    const problem = existing
      ? await tx.problem.update({ where: { id: existing.id }, data: fields, select: { id: true } })
      : await tx.problem.create({
          data: { ...fields, packageUuid: pkg.uuid, tags: { connect: fields.tags.set } },
          select: { id: true },
        });

    const latest = await tx.problemVersion.aggregate({
      where: { problemId: problem.id },
      _max: { number: true },
    });
    const number = (latest._max.number ?? 0) + 1;
    const version = await tx.problemVersion.create({
      data: {
        problemId: problem.id,
        number,
        packageHash: pkg.hash,
        statementHtml,
        editorialHtml,
        samples,
        timeLimitMs: pkg.timeLimitMs,
        memoryLimitMb: pkg.memoryLimitMb,
        checker: { ...pkg.checker },
        tests: {
          create: pkg.tests.map((test, ordinal) => ({
            ordinal,
            name: test.name,
            isSample: test.isSample,
            inputHash: test.inputHash,
            answerHash: test.answerHash,
          })),
        },
      },
      select: { id: true },
    });
    await tx.problem.update({ where: { id: problem.id }, data: { currentVersionId: version.id } });

    return { problemId: problem.id, slug: pkg.slug, version: number, status: existing ? "updated" : "created" };
  });
}
